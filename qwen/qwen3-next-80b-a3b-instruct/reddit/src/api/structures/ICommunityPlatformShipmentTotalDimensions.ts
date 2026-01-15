import { tags } from "typia";

export namespace ICommunityPlatformShipmentTotalDimensions {
  /**
   * Overall dimensions of the shipment package.
   *
   * Contains the height, width, and depth measurements of the main shipping
   * container in centimeters. Used for calculating volumetric weight, space
   * optimization during consolidation, and determining appropriate packaging
   * materials.
   *
   * The dimensions field captures the outer physical measurements of the
   * shipment's primary container, which is critical for:
   *
   * - Volumetric weight calculations (where carriers charge based on
   *   volume-weight ratio)
   * - Warehouse storage optimization (maximizing space utilization)
   * - Carrier capacity planning (ensuring shipments fit in transport vehicles)
   * - Packaging selection (determining appropriate box size and protective
   *   materials)
   *
   * The measurements represent the maximum extent of the package in three
   * dimensions, and should include any protruding elements like handles or
   * straps. Values are measured and recorded in centimeters with typical
   * precision of 0.1cm accuracy.
   *
   * The system validates that all three dimensions are provided and are
   * positive values. All dimensions are mandatory fields in the request and
   * response schemas to ensure accurate cost calculation and logistical
   * planning.
   */
  export type ISummary = {
    /**
     * Height of the shipment package in centimeters.
     *
     * The vertical dimension of the primary shipping container measured
     * from bottom to top. This value is critical for volumetric weight
     * calculations, warehouse storage optimization, and carrier handling
     * requirements.
     *
     * Measured using calibrated instruments during the packing process at
     * fulfillment centers. The measurement includes the entire outer
     * dimension of the package, including any protruding elements such as
     * handles, straps, or protective corner guards.
     *
     * The minimum value is 0 (though practical shipments will always have
     * positive height), and values are recorded with precision of 0.1cm to
     * ensure accurate volumetric calculations.
     *
     * Height is used in conjunction with width and depth to calculate the
     * container's volume, which is then compared against actual weight to
     * determine the carrier's charging method (actual weight vs. volumetric
     * weight).
     */
    height: number & tags.Minimum<0>;

    /**
     * Width of the shipment package in centimeters.
     *
     * The horizontal dimension of the primary shipping container measured
     * from side to side. This value is critical for volumetric weight
     * calculations, warehouse storage optimization, and carrier handling
     * requirements.
     *
     * Measured using calibrated instruments during the packing process at
     * fulfillment centers. The measurement includes the entire outer
     * dimension of the package, including any protruding elements such as
     * handles, straps, or protective corner guards.
     *
     * The minimum value is 0 (though practical shipments will always have
     * positive width), and values are recorded with precision of 0.1cm to
     * ensure accurate volumetric calculations.
     *
     * Width is used in conjunction with height and depth to calculate the
     * container's volume, which is then compared against actual weight to
     * determine the carrier's charging method (actual weight vs. volumetric
     * weight).
     */
    width: number & tags.Minimum<0>;

    /**
     * Depth of the shipment package in centimeters.
     *
     * The front-to-back dimension of the primary shipping container
     * measured from the front face to the back face. This value is critical
     * for volumetric weight calculations, warehouse storage optimization,
     * and carrier handling requirements.
     *
     * Measured using calibrated instruments during the packing process at
     * fulfillment centers. The measurement includes the entire outer
     * dimension of the package, including any protruding elements such as
     * handles, straps, or protective corner guards.
     *
     * The minimum value is 0 (though practical shipments will always have
     * positive depth), and values are recorded with precision of 0.1cm to
     * ensure accurate volumetric calculations.
     *
     * Depth is used in conjunction with height and width to calculate the
     * container's volume, which is then compared against actual weight to
     * determine the carrier's charging method (actual weight vs. volumetric
     * weight).
     */
    depth: number & tags.Minimum<0>;
  };
}
