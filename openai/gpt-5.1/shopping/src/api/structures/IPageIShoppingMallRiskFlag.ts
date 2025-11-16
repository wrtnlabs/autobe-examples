import { IPage } from "./IPage";
import { IShoppingMallRiskFlag } from "./IShoppingMallRiskFlag";

export namespace IPageIShoppingMallRiskFlag {
  /**
   * Paginated collection of risk flag summaries associated with an
   * authentication credential.
   *
   * This page wrapper is returned by the PATCH
   * `/shoppingMall/platformAdmin/authCredentials/{authCredentialsId}/riskFlags`
   * operation and represents a window over the `shopping_mall_risk_flags`
   * Prisma model. The `pagination` field describes how the result set is
   * sliced, while the `data` array contains `IShoppingMallRiskFlag.ISummary`
   * projections suitable for admin dashboards and security tooling that need
   * to quickly review the current and historical risk posture of a given set
   * of credentials.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current slice of risk flag results.
     *
     * This property follows the `IPage.IPagination` schema and exposes the
     * current page index, page size limit, total number of records, and
     * total number of pages computed from the `shopping_mall_risk_flags`
     * table. Admin UIs and internal risk dashboards rely on this
     * information to render paging controls and to understand how many
     * additional pages of risk flags are available for a given credentials
     * record.
     */
    pagination: IPage.IPagination;

    /**
     * Collection of risk flag summary records for the requested page.
     *
     * Each element in this array is an `IShoppingMallRiskFlag.ISummary` DTO
     * that corresponds to a single row from the `shopping_mall_risk_flags`
     * Prisma model scoped to a particular `shopping_mall_auth_credentials`
     * record. These summaries surface key attributes such as whether the
     * flag is active and when it was created, and they are optimized for
     * use in list views, admin consoles, and risk analytics panels rather
     * than for full-detail inspection.
     */
    data: IShoppingMallRiskFlag.ISummary[];
  };
}
