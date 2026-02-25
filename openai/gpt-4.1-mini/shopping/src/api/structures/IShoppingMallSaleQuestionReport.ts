import { tags } from "typia";

export namespace IShoppingMallSaleQuestionReport {
  /**
   * Request parameters for filtering and paginating sales questions report data in the administrator report API. Supports filtering by seller, status, date ranges, and sorting.
   */
  export type IRequest = {
    /**
     * Page number for pagination, starting from 1. Defaults to first page.
     *
     * @x-autobe-specification Indicates the page number to retrieve in paginated results, with default 1 if not provided.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of items per page for pagination. Defaults to 20.
     *
     * @x-autobe-specification Defines the maximum number of records per page in paginated responses, defaulting to 20, maximum 100.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Field name to sort by, e.g., 'date', 'status', or 'seller'.
     *
     * @x-autobe-specification Field name used to sort the report results, commonly 'date', 'status', or 'seller'.
     */
    sortBy?: string | undefined;

    /**
     * Sort order direction of results: ascending ('asc') or descending ('desc'). Defaults to 'asc'.
     *
     * @x-autobe-specification Sort order direction for report results, either 'asc' for ascending or 'desc' for descending. Defaults to 'asc'.
     */
    sortOrder?: "asc" | "desc" | undefined;

    /**
     * Filter sales questions by the seller's unique UUID.
     *
     * @x-autobe-specification UUID representing a seller id used to filter sales questions related to sales by this seller.
     */
    sellerId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter sales questions by their status (e.g., 'open', 'answered', 'closed', 'pending').
     *
     * @x-autobe-specification String representing sales question status such as 'open', 'closed', 'pending', or 'answered' used to filter the questions.
     */
    status?: string | undefined;

    /**
     * Start date-time to filter questions created on or after this.
     *
     * @x-autobe-specification ISO 8601 formatted date-time string defining start of the filter range for question creation date.
     */
    dateFrom?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date-time to filter questions created on or before this.
     *
     * @x-autobe-specification ISO 8601 formatted date-time string defining end of the filter range for question creation date.
     */
    dateTo?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Search keyword to filter questions by their content or related fields.
     *
     * @x-autobe-specification Free-text string used to filter questions by searching in title and body content fields.
     */
    search?: string | undefined;
  };

  /**
   * Aggregated summary report of sales questions showing counts by status and recent activity timestamp, linked to a specific sale product listing.
   */
  export type ISummary = {
    /**
     * Unique identifier for the sales question report summary.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_sale_questions.id aggregation as unique report identifier.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The sale (product listing) this report summary is related to.
     *
     * @x-autobe-specification Aggregated sale product listing identifier derived from shopping_mall_sale_questions.sales.id for contextual report association.
     */
    saleId: string;

    /**
     * Total number of questions asked for this sale.
     *
     * @x-autobe-specification Count of all sales questions related to the sale regardless of status, aggregated for reporting purposes.
     */
    questionCount: number & tags.Type<"int32">;

    /**
     * Number of questions currently pending response.
     *
     * @x-autobe-specification Number of questions with status 'pending' indicating they are awaiting seller response.
     */
    pendingCount: number & tags.Type<"int32">;

    /**
     * Number of questions answered by the seller.
     *
     * @x-autobe-specification Number of questions with status 'answered' indicating they have been replied to by the seller.
     */
    answeredCount: number & tags.Type<"int32">;

    /**
     * Number of questions rejected or dismissed.
     *
     * @x-autobe-specification Number of questions marked 'rejected' or dismissed and not shown as active inquiries.
     */
    rejectedCount: number & tags.Type<"int32">;

    /**
     * Timestamp of the last question asked; nullable if no questions exist.
     *
     * @x-autobe-specification Timestamp of the most recent question asked related to this sale; can be null if no questions exist.
     */
    lastAskedAt: (string & tags.Format<"date-time">) | null;
  };
}
