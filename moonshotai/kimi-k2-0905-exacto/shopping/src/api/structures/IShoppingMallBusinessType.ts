import { tags } from "typia";

export namespace IShoppingMallBusinessType {
  /**
   * Summary representation of business types for marketplace sellers and
   * vendors. This entity classifies different types of businesses operating
   * within the shopping mall platform, such as individual sellers, small
   * businesses, enterprises, manufacturers, distributors, and wholesalers.
   * Business types are used for operational categorization, pricing tiers,
   * feature access control, and regulatory compliance management.
   */
  export type ISummary = {
    /** Unique identifier for the business type */
    id: string & tags.Format<"uuid">;

    /** Name of the business type */
    name: string;

    /** Description of the business type category */
    description?: string | undefined;

    /** Unique code identifier for the business type */
    code: string & tags.MinLength<1> & tags.MaxLength<50>;
  };
}
