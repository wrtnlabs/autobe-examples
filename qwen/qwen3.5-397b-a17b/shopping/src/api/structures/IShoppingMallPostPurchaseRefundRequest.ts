import { tags } from "typia";

import { IShoppingMallMember } from "./IShoppingMallMember";
import { IShoppingMallOrderItem } from "./IShoppingMallOrderItem";

export namespace IShoppingMallPostPurchaseRefundRequest {
  /**
   * Search criteria for browsing post-purchase refund requests with filtering and pagination support.
   *
   * This request DTO defines optional query parameters for retrieving refund requests. All properties are optional to allow flexible querying patterns. Use status to filter by workflow state, created_at for date range queries, and shopping_mall_order_item_id to find requests for a specific order item.
   *
   * Pagination is controlled through page and limit parameters. The API returns results sorted by creation date in descending order by default, showing the most recent requests first. Access control is enforced server-side based on the authenticated user's role.
   */
  export type IRequest = {
    /**
     * Filter refund requests by their current workflow status.
     *
     * Accepts either a single status value or an array of statuses for matching. Use this to find requests in specific states such as pending review, approved, or rejected.
     *
     * When filtering by multiple statuses, the API returns requests matching any of the provided values (OR logic).
     *
         * @x-autobe-specification Query filter parameter for status column.
         *   Supports exact match (single string) or IN clause (array of
         *   strings). Valid values: 'pending', 'approved', 'rejected'. Applied
         *   as WHERE status = ? or WHERE status IN (?, ?, ...).
     */
    status?: string | string[] | undefined;

    /**
     * Filter refund requests by their creation date range.
     *
     * Provides granular control over date-based filtering with separate lower bound (gte) and upper bound (lte) parameters. Use gte to find requests created on or after a specific date, and lte to find requests created on or before a specific date.
     *
     * Both boundaries are optional, enabling open-ended range queries such as 'all requests since last month' or 'all requests before a specific date'.
     *
         * @x-autobe-specification Date range filter parameter for created_at
         *   column. Object with optional gte (greater than or equal) and lte
         *   (less than or equal) properties. Applied as WHERE created_at >= ?
         *   AND created_at <= ?. Both boundaries optional for open-ended
         *   ranges.
     */
    created_at?:
      | {
          gte?: (string & tags.Format<"date-time">) | undefined;
          lte?: (string & tags.Format<"date-time">) | undefined;
        }
      | undefined;

    /**
     * Filter refund requests by a specific order item.
     *
     * Use this parameter to retrieve all refund requests associated with a particular order item. This is useful when you need to check if an order item already has a refund request or to view the refund history for a specific purchased item.
     *
     * The value must be a valid UUID matching the order item's unique identifier.
     *
         * @x-autobe-database-schema-property shopping_mall_order_item_id
         * @x-autobe-specification Exact match filter for
         *   shopping_mall_order_item_id foreign key column. Applied as WHERE
         *   shopping_mall_order_item_id = ?. UUID format validated. Used to
         *   find all refund requests for a specific order item.
     */
    shopping_mall_order_item_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Page number for paginated results.
     *
     * Specifies which page of results to retrieve, with page numbering starting from 1. The first page is page 1, the second page is page 2, and so on.
     *
     * This parameter works in conjunction with the limit parameter to control result set pagination. If not provided, defaults to the first page.
     *
         * @x-autobe-specification Pagination parameter for offset calculation.
         *   1-indexed page number (page 1 = first page). Applied as OFFSET
         *   (page - 1) * limit. Defaults to 1 if not provided. Minimum value is
         *   1.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records to return per page.
     *
     * Controls the page size for paginated responses. Set this value to determine how many refund request records appear on each page of results.
     *
     * The value must be between 1 and 100 inclusive. If not provided, the API uses a default limit. Use smaller limits for faster response times, or larger limits to reduce the number of API calls needed to browse all results.
     *
         * @x-autobe-specification Pagination parameter for page size. Maximum
         *   number of records per page. Applied as LIMIT ?. Constrained to
         *   maximum 100 records per page. Minimum value is 1. Controls the size
         *   of each page in the paginated response.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Summary representation of a post-purchase refund request for list displays.
   *
   * Contains essential fields for browsing refund requests including the refund reason, current status, and references to the requesting member and order item. Used in paginated list responses for member, seller, and admin dashboards.
   *
   * The member property references the customer who submitted the request. The orderItem property provides context about the purchased item being refunded. The status field indicates the current workflow state (pending, approved, or rejected).
   */
  export type ISummary = {
    /**
     * Unique identifier for the refund request.
     *
     * Primary key assigned at creation time. Used to reference this specific refund request in API operations and user interfaces.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from
         *   shopping_mall_post_purchase_refund_requests.id. UUID format.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Customer's explanation for requesting the refund.
     *
     * This text is provided by the customer when submitting the refund request and helps the seller understand the issue. Used during the seller's review process to make an informed approval or rejection decision.
     *
         * @x-autobe-database-schema-property reason
         * @x-autobe-specification Direct mapping from
         *   shopping_mall_post_purchase_refund_requests.reason.
         *   Customer-provided text explaining the refund request.
     */
    reason: string;

    /**
     * Current workflow state of the refund request.
     *
     * Tracks the refund request through the review process. Valid values are 'pending' (awaiting seller review), 'approved' (seller approved, refund processed), and 'rejected' (seller declined the request). Determines what actions are available to the customer and seller.
     *
         * @x-autobe-database-schema-property status
         * @x-autobe-specification Direct mapping from
         *   shopping_mall_post_purchase_refund_requests.status. Values:
         *   pending, approved, rejected.
     */
    status: string;

    /**
     * The customer who submitted the refund request.
     *
     * References the member account that owns this refund request. Contains summary information about the customer for identification purposes in administrative and seller views.
     *
         * @x-autobe-database-schema-property member
         * @x-autobe-specification JOIN from
         *   shopping_mall_post_purchase_refund_requests.shopping_mall_member_id
         *   to shopping_mall_members.id. Returns IShoppingMallMember.ISummary.
     */
    member: IShoppingMallMember.ISummary;

    /**
     * The order item being refunded.
     *
     * References the specific purchased item within an order that this refund request concerns. Provides context about the product, variant, quantity, and price of the item being refunded.
     *
         * @x-autobe-database-schema-property orderItem
         * @x-autobe-specification JOIN from
         *   shopping_mall_post_purchase_refund_requests.shopping_mall_order_item_id
         *   to shopping_mall_order_items.id. Returns
         *   IShoppingMallOrderItem.ISummary.
     */
    orderItem: IShoppingMallOrderItem.ISummary;

    /**
     * Timestamp when the refund request was created.
     *
     * Records when the customer submitted the refund request. Used for sorting, filtering, and determining request age. Format is ISO 8601 with timezone information.
     *
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Direct mapping from
         *   shopping_mall_post_purchase_refund_requests.created_at. ISO 8601
         *   date-time format.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the refund request was last modified.
     *
     * Updated whenever the refund request state changes, such as when a seller approves or rejects the request. Used to track the most recent activity on the request. Format is ISO 8601 with timezone information.
     *
         * @x-autobe-database-schema-property updated_at
         * @x-autobe-specification Direct mapping from
         *   shopping_mall_post_purchase_refund_requests.updated_at. ISO 8601
         *   date-time format. Updated on status changes.
     */
    updated_at: string & tags.Format<"date-time">;
  };
}
