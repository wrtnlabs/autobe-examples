export namespace IShoppingMallSaleSalesAnalytic {
  /**
   * Sales analytics summary DTO for reporting aggregated sales data including total amount, order counts, quantities sold, and optional grouping by date, seller, or category.
   */
  export type ISummary = {};

  /**
   * A paginated response object for sales analytics summaries, containing an array of grouped sales summary records detailing total sales, order counts, and quantities, together with pagination metadata.
   */
  export type IResponse = {};

  /**
   * Request object for filtering sales data by date range, product categories, sellers, order statuses, with pagination and sorting, enabling advanced sales analytics.
   */
  export type IRequest = {};
}
