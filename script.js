// Simulation d'interactions basiques
document.addEventListener('DOMContentLoaded', function() {
    // Simulation du survol des nœuds
    const nodes = document.querySelectorAll('.mock-node');
    nodes.forEach(node => {
        node.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.2)';
            this.style.zIndex = '10';
        });
        
        node.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
            this.style.zIndex = '1';
        });
    });
    
    // Simulation des contrôles de range
    const ranges = document.querySelectorAll('.range-input');
    ranges.forEach(range => {
        range.addEventListener('input', function() {
            // Simulation de mise à jour visuelle
            console.log('Filtre mis à jour:', this.value);
        });
    });
    
    // Simulation des checkboxes
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            console.log('Filtre togglé:', this.id, this.checked);
        });
    });
});