import { tags } from "typia";

import { IUuid } from "./IUuid";

export namespace IStatisticsTopProducts {
  /**
   * Request parameters for filtering and configuring top products performance
   * analysis. Enables flexible date range selection, category filtering,
   * seller segmentation, performance thresholds, and sorting criteria for
   * comprehensive product ranking analysis.
   */
  export type IRequest = {
    /**
     * Start date for the top products analysis period in ISO 8601 format
     * (YYYY-MM-DD). Filters product performance data to include only sales
     * from this date onwards.
     */
    start_date?: (string & tags.Format<"date">) | undefined;

    /**
     * End date for the top products analysis period in ISO 8601 format
     * (YYYY-MM-DD). Filters product performance data to include only sales
     * up to and including this date.
     */
    end_date?: (string & tags.Format<"date">) | undefined;

    /**
     * Maximum number of top products to return in the analysis results.
     * Default is typically 100, but can be adjusted based on analysis
     * needs. Range from 1 to 1000 products.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>)
      | undefined;

    /**
     * Optional array of product category IDs to filter top products
     * analysis. If provided, only products within these categories will be
     * considered. Useful for category-specific performance analysis.
     */
    category_ids?: IUuid[] | undefined;

    /**
     * Optional array of seller IDs to filter top products analysis. If
     * provided, only products from these specific sellers will be
     * considered. Enables seller-specific product performance analysis.
     */
    seller_ids?: IUuid[] | undefined;

    /**
     * Optional minimum number of sales units required for a product to be
     * considered in top products analysis. Helps filter out products with
     * very low sales volume.
     */
    minimum_sales?: (number & tags.Type<"int32">) | undefined;

    /**
     * Optional minimum revenue threshold in platform currency. Only
     * products with total sales above this amount will be considered for
     * top products ranking.
     */
    minimum_revenue?: number | undefined;

    /**
     * Metric used for ranking products in the top products analysis.
     * Options include total_revenue (default), total_units sold,
     * average_rating, or recent_sales velocity. Determines the primary
     * sorting criteria for results.
     */
    sort_by?:
      | "total_revenue"
      | "total_units"
      | "average_rating"
      | "recent_sales"
      | undefined;

    /**
     * Whether to include products that are currently inactive or archived
     * in the top products analysis. When false, only currently active
     * products are considered. Default is false to focus on currently
     * available products.
     */
    include_inactive?: boolean | undefined;
  };

  /**
   * Top performing products statistics summary providing comprehensive
   * business intelligence metrics for marketplace analytics and strategic
   * decision making.
   *
   * This summary aggregates critical product performance indicators including
   * sales revenue, unit volume, customer satisfaction metrics, and
   * profitability analysis. The analytics serve as the foundation for top
   * product rankings, performance benchmarking, merchandising optimization,
   * and strategic product placement decisions across competitive marketplace
   * segments.
   *
   * The summary maintains comprehensive relationships linking products to
   * their sellers, categories, and customer feedback systems while tracking
   * financial performance, market acceptance, and profitability indicators.
   * Data integrates transaction history, inventory movements, review systems,
   * and cost analysis to provide complete product success measurement within
   * competitive marketplace environments.
   *
   * Used extensively in executive dashboards, seller performance programs,
   * market trend analysis, and strategic planning initiatives to identify
   * successful products while enabling data-driven decisions about product
   * promotion, inventory investment, and marketplace positioning for revenue
   * optimization and competitive advantage development.
   */
  export type ISummary = {
    /** Unique identifier for the product summary entry */
    id: string & tags.Format<"uuid">;

    /** Reference to the product entity */
    product_id: string & tags.Format<"uuid">;

    /**
     * Human-readable product name displayed throughout the marketplace for
     * customer identification and catalog organization. The name serves as
     * immediate product identification in dashboards, analytics reports,
     * and seller performance evaluations while supporting brand recognition
     * and product differentiation strategies across competitive marketplace
     * segments.
     */
    product_name: string;

    /**
     * Stock keeping unit identifier for inventory tracking and order
     * fulfillment coordination. The SKU enables precise variant management,
     * inventory monitoring, and supply chain optimization while supporting
     * operational analysis and demand forecasting for strategic business
     * planning and marketplace inventory optimization.
     */
    product_sku: string;

    /**
     * Primary product category classification supporting marketplace
     * navigation and customer discovery. The category enables market
     * segmentation analysis, competitor benchmarking, and merchandising
     * strategy development while facilitating cross-selling opportunities
     * and customer preference analysis across related product groups and
     * marketplace segments.
     */
    category_name: string;

    /**
     * Official business name of the selling merchant displayed for customer
     * trust and brand recognition. The business name serves as a trust
     * indicator in marketplace evaluations, supports seller reputation
     * analysis, and enables competitive assessment of merchant performance
     * while facilitating account management and strategic partnership
     * development within the marketplace ecosystem.
     */
    seller_business_name: string;

    /**
     * Aggregate gross revenue generated by this product across all
     * marketplace transactions including product sales, shipping fees, and
     * promotional adjustments. This financial metric indicates market
     * demand and customer acceptance while supporting pricing strategy
     * analysis, promotional campaign evaluation, and revenue prediction
     * modeling for strategic business planning and marketplace growth
     * assessment.
     */
    total_sales_amount: number;

    /**
     * Complete unit count of successful product sales across marketplace
     * orders indicating customer demand volume and inventory turnover
     * velocity. The quantity metric supports supplier negotiation,
     * manufacturing planning, and tactical pricing decisions while enabling
     * inventory optimization and fulfillment capacity planning across
     * multiple marketplace channels and customer segments.
     */
    total_quantity_sold: number & tags.Type<"int32">;

    /**
     * Customer review rating calculated on a 1.0 to 5.0 scale where 5.0
     * represents maximum satisfaction and 1.0 indicates significant
     * customer dissatisfaction. The rating serves as a key performance
     * indicator for product quality, customer satisfaction trends, and
     * marketplace positioning while supporting competitive analysis,
     * product development prioritization, and seller performance evaluation
     * across multiple quality dimensions and customer feedback cycles.
     */
    average_rating: number;

    /**
     * Total number of customer reviews contributed for this product
     * indicating market engagement and customer participation levels. The
     * count supports statistical significance assessment for reliability
     * evaluation, marketing strategy development, and customer feedback
     * program effectiveness while enabling trend analysis and comparative
     * product performance evaluation across marketplace segments and
     * competitive positioning analysis.
     */
    review_count: number & tags.Type<"int32">;

    /**
     * Calculated profit margin per unit for comprehensive business analysis
     * including all costs, fees, and operational expenses. The margin
     * metric supports product line profitability assessment, competitive
     * pricing strategy development, and operational efficiency optimization
     * while enabling strategic decisions about product promotion, inventory
     * investment, and marketplace focus allocation for maximum return
     * optimization and business growth planning.
     */
    margin_amount: number;

    /**
     * Timestamp indicating record creation time supporting audit trail
     * integrity, performance measurement analysis, and historical trend
     * evaluation. The timestamp enables comparative analysis across
     * different time periods, supports attribution analysis for marketing
     * campaigns and seasonal planning, and provides the foundation for
     * time-based filtering and performance benchmarking across marketplace
     * segments and competitive analysis scenarios.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
