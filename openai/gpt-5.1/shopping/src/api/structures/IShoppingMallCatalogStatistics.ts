import { tags } from "typia";

export namespace IShoppingMallCatalogStatistics {
  /**
   * List of brand-level catalog statistics for the shoppingMall platform.
   *
   * Each array element represents a single brand and its aggregated count of
   * active or otherwise countable products in the catalog. This DTO is
   * designed for administrative dashboards and analytical views, not for
   * end-customer product browsing.
   */
  export type IBrandProductCounts =
    IShoppingMallCatalogStatistics.IBrandProductCount[];

  /**
   * Aggregated catalog statistics for a single brand within the shoppingMall
   * platform.
   *
   * Represents one row in the brand-level product count analytics, combining
   * brand identification metadata with an aggregated count of products that
   * are considered active or otherwise countable according to business rules.
   * Used primarily in platform administrator dashboards and catalog
   * operations tooling, not in customer-facing product listings.
   */
  export type IBrandProductCount = {
    /**
     * Unique identifier of the brand as stored in the shopping_mall_brands
     * Prisma model.
     *
     * This will typically correspond to the primary key of the brand entity
     * (for example, a UUID string). It can be used by admin tools to
     * navigate to brand detail pages or to join with richer brand metadata
     * in other API responses or internal services.
     */
    brandId: string;

    /**
     * Human-readable or system-wide unique code for the brand, if such a
     * code exists in the shopping_mall_brands schema.
     *
     * This field allows dashboards and reporting tools to reference brands
     * using a stable code value instead of or in addition to the opaque
     * brandId. If the underlying schema does not define a brand code, this
     * property may be left empty or omitted at implementation time.
     */
    brandCode?: string | undefined;

    /**
     * Display name of the brand as visible to administrators.
     *
     * This is typically the official brand name that appears in catalog
     * management UIs and dashboards, making the analytics output easier to
     * understand without requiring a separate lookup by brandId.
     */
    brandName: string;

    /**
     * Number of catalog products associated with this brand that qualify as
     * "active" or otherwise countable according to platform business
     * rules.
     *
     * The aggregation should respect any visibility, status, or compliance
     * filters defined in the shopping_mall_products schema (for example,
     * excluding draft, archived, or fully hidden products).
     */
    productCount: number & tags.Type<"int32"> & tags.Minimum<0>;
  };

  /**
   * Aggregated distribution of catalog products by status for the
   * shoppingMall platform.
   *
   * Provides a compact, read-only summary of how many products currently
   * exist in each lifecycle or publication status bucket, such as draft,
   * active, or archived. This DTO is intended for administrative dashboards
   * and operational monitoring screens rather than customer-facing product
   * search.
   */
  export type IProductStatusSummary = {
    /**
     * List of status-level product count buckets across the entire catalog.
     *
     * Each element represents a single product status value and the number
     * of products that currently have that status in the
     * shopping_mall_products table. The list can be used to render charts,
     * KPIs, and workflow distribution visualizations.
     */
    buckets: IShoppingMallCatalogStatistics.IProductStatusBucket[];

    /**
     * Total number of products represented across all status buckets.
     *
     * This is typically the sum of productCount values from all buckets. It
     * is included to simplify dashboard implementations and to provide a
     * single reference number for overall catalog size.
     */
    totalCount: number & tags.Type<"int32"> & tags.Minimum<0>;
  };

  /**
   * Single status-level bucket in the product status distribution summary.
   *
   * Represents one status category and the corresponding count of products in
   * the shopping_mall_products table that currently have that status. This
   * DTO is used inside the
   * IShoppingMallCatalogStatistics.IProductStatusSummary.buckets array.
   */
  export type IProductStatusBucket = {
    /**
     * Logical product status label for this bucket.
     *
     * Typical examples might include values such as "draft",
     * "pendingReview", "active", "suspended", or "archived", depending on
     * how the shopping_mall_products Prisma model encodes product lifecycle
     * state. Implementations should map raw database status fields into
     * stable, documented labels suitable for API consumers.
     */
    status: string;

    /**
     * Number of products whose status falls into this bucket.
     *
     * The count is computed by grouping rows in the shopping_mall_products
     * table by their status field and counting how many belong to each
     * group. It must be a non-negative integer.
     */
    productCount: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
