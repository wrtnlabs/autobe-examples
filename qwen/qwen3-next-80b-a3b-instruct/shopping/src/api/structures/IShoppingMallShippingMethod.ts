import { tags } from "typia";

export namespace IShoppingMallShippingMethod {
  /**
   * Summary representation of shipping methods for use in list displays and
   * embedded references.
   *
   * Contains essential information about shipping options for context in
   * order and shipping displays.
   */
  export type ISummary = {
    /**
     * Unique identifier for the shipping method. This ID is used to
     * reference this specific shipping option in orders and other related
     * operations.
     */
    id: string;

    /**
     * The visible name of the shipping method as presented to customers
     * during checkout. This should be customer-friendly and descriptive.
     */
    name: string;

    /**
     * Additional details about the shipping method that provide context
     * about its features or service characteristics.
     */
    description?: string | undefined;

    /**
     * The monetary cost of using this shipping method, typically in USD.
     * Must be non-negative to reflect actual pricing.
     */
    cost: number & tags.Minimum<0>;

    /**
     * The estimated number of business days for delivery using this
     * shipping method. Minimum of 1 day to reflect realistic shipping
     * timelines.
     */
    estimatedDeliveryDays: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * The name of the logistics carrier providing this shipping service.
     * Examples: 'FedEx', 'UPS', 'DHL', 'USPS', or 'In-House Delivery'.
     */
    carrier: string;

    /**
     * The service tier classification of this shipping method. Defines the
     * speed guarantee and service quality level.
     */
    serviceLevel: "standard" | "expedited" | "priority" | "overnight";

    /**
     * Maximum weight in kilograms supported by this shipping method.
     * Ensures proper package compatibility and avoids rejection.
     */
    maxWeight?: (number & tags.Minimum<0>) | undefined;
  };
}
