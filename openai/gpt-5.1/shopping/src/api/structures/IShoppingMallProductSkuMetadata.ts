export namespace IShoppingMallProductSkuMetadata {
  /**
   * Free-form metadata container for SKU-level custom attributes in update
   * operations.
   *
   * Represents a flexible key-value map that allows integrators and
   * downstream systems to attach additional non-modeled attributes to a SKU,
   * such as external system identifiers, feature flags, or analytics tags.
   *
   * Each entry is stored as a string value so that arbitrary metadata can be
   * safely transported without enforcing a rigid schema, while still keeping
   * the overall structure in a named, reusable type.
   */
  export type IUpdate = {
    /**
     * A single metadata value associated with a custom key.
     *
     * Metadata values are stored as strings so callers can serialize
     * booleans, numbers, or JSON themselves if needed, while the backend
     * treats them as opaque text.
     */
    [key: string]: string;
  };
}
