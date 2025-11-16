import { IPage } from "./IPage";
import { IShoppingMallProductRating } from "./IShoppingMallProductRating";

export namespace IPageIShoppingMallProductRating {
  /**
   * Paginated result set for product ratings retrieved by search/analytics
   * APIs for admin or seller actors in the e-commerce shopping module.
   *
   * Supports management and analytics dashboards by wrapping an array of
   * summarized product ratings (IShoppingMallProductRating.ISummary) and
   * comprehensive page metadata. Ensures operational analytics, quality
   * controls, and review aggregation flows can ingest or display curated sets
   * of customer assigned ratings to SKUs/products. Structure is invariant and
   * production-grade: 'data' always contains the queried ratings or is empty
   * when no matching ratings exist; 'pagination' provides precise context for
   * list views and navigation controls.
   *
   * Designed for robust integration in reporting, workflow panels, and
   * abuse/statistics pipelines. No row or referenced object may depart from
   * strict summary type invariants. Used in control towers, QA moderation,
   * and support escalation API flows across admin and seller dashboard
   * subsystems.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallProductRating.ISummary[];
  };
}
