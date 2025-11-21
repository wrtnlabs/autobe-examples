import { tags } from "typia";

import { IUuid } from "./IUuid";
import { IShoppingMallProductCategory } from "./IShoppingMallProductCategory";

export namespace IStatisticsProductCategorySales {
  /**
   * Request parameters for filtering and configuring sales statistics
   * analysis by product category. Enables flexible date range selection,
   * category filtering, seller segmentation, and revenue thresholds for
   * targeted business intelligence reporting.
   */
  export type IRequest = {
    /**
     * Start date for the sales analysis period in ISO 8601 format
     * (YYYY-MM-DD). Filters sales data to include only transactions from
     * this date onwards.
     */
    start_date?: (string & tags.Format<"date">) | undefined;

    /**
     * End date for the sales analysis period in ISO 8601 format
     * (YYYY-MM-DD). Filters sales data to include only transactions up to
     * and including this date.
     */
    end_date?: (string & tags.Format<"date">) | undefined;

    /**
     * Optional array of product category IDs to filter sales analysis. If
     * provided, only sales from products in these categories will be
     * included. If omitted, analysis includes all categories.
     */
    category_ids?: IUuid[] | undefined;

    /**
     * Optional array of seller IDs to filter sales analysis. If provided,
     * only sales from these specific sellers will be included. If omitted,
     * analysis includes all sellers.
     */
    seller_ids?: IUuid[] | undefined;

    /**
     * Optional minimum revenue threshold in platform currency. Only
     * categories with total sales above this amount will be included in
     * results. Useful for focusing on high-performing categories.
     */
    minimum_revenue?: number | undefined;

    /**
     * Whether to include sales from subcategories when filtering by parent
     * category IDs. When true, includes all descendant categories in the
     * hierarchy. Default is true for comprehensive analysis.
     */
    include_subcategories?: boolean | undefined;
  };

  /**
   * Summary representation of product category sales statistics with
   * aggregated performance metrics for strategic analysis and reporting.
   *
   * Provides essential sales data by product category enhanced with growth
   * indicators and comparative metrics for business intelligence purposes.
   * Combines multiple analytics data sources to deliver comprehensive
   * category performance assessment suitable for executive dashboards and
   * operational oversight.
   *
   * Used extensively in sales reporting, inventory planning, merchandising
   * strategy development, and performance optimization initiatives within the
   * shopping mall ecosystem.
   */
  export type ISummary = {
    /**
     * Product category reference providing complete context including
     * hierarchical position and primary metadata.
     */
    category: IShoppingMallProductCategory.ISummary;

    /**
     * Total sales revenue for the category providing financial performance
     * measurement and strategic planning data.
     */
    total_sales: number & tags.Minimum<0>;

    /**
     * Total number of orders containing products from this category
     * providing transaction volume metrics and demand indicators.
     */
    total_orders: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total quantity of individual products sold within the category
     * providing inventory velocity measurement and stocking insights.
     */
    total_products_sold: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Average order value for category transactions providing pricing
     * insight and customer behavior understanding.
     */
    avg_order_value: number & tags.Minimum<0>;

    /**
     * Period-to-period growth rate providing trend analysis and performance
     * improvement measurement.
     */
    growth_rate: number & tags.Minimum<-1> & tags.Maximum<1>;

    /**
     * Percentage of total marketplace sales attributed to this category
     * providing competitive position and strategic importance assessment.
     */
    market_share: number & tags.Minimum<0> & tags.Maximum<1>;

    /**
     * Reporting period for category sales providing temporal context for
     * metric interpretation and trend analysis.
     */
    date_range: string;
  };
}
