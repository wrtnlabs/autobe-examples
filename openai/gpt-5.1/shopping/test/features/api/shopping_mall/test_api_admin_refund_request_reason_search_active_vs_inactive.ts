import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestReason";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";

/**
 * Verify that admin search for refund request reasons correctly filters by
 * `is_active` flag.
 *
 * Business context: Administrators manage a catalog of standardized
 * refund/cancellation reasons in `shopping_mall_refund_request_reasons`. Each
 * reason has an `is_active` flag that determines whether it can be used for new
 * refund or cancellation requests. The admin search endpoint (PATCH
 * /shoppingMall/admin/refundRequestReasons) exposes an `is_active` filter in
 * its request body (IShoppingMallRefundRequestReason.IRequest.is_active) so
 * that consoles can switch between active, inactive, or all reasons.
 *
 * This test ensures that:
 *
 * - When `is_active=true`, only active reasons are returned.
 * - When `is_active=false`, only inactive reasons are returned.
 * - When `is_active` is null, both active and inactive reasons can be listed.
 * - Pagination metadata (IPage.IPagination) correctly reflects the number of
 *   matching records.
 *
 * Scenario steps:
 *
 * 1. Join an admin via POST /auth/admin/join.
 * 2. Using the authenticated admin connection, create two refund request reasons
 *    via POST /shoppingMall/admin/refundRequestReasons:
 *
 *    - `activeReason`: is_active=true.
 *    - `inactiveReason`: is_active=false.
 * 3. Search with `is_active=true` and page=1, limit large enough:
 *
 *    - Call PATCH /shoppingMall/admin/refundRequestReasons with body: { page: 1,
 *         limit: 50, is_active: true }.
 *    - Assert that:
 *
 *         - All returned summaries have is_active === true.
 *         - `activeReason.id` exists in `data`.
 *         - `inactiveReason.id` does NOT exist in `data`.
 *         - Pagination.records === data.length and records >= 1.
 * 4. Search with `is_active=false`:
 *
 *    - Call PATCH /shoppingMall/admin/refundRequestReasons with body: { page: 1,
 *         limit: 50, is_active: false }.
 *    - Assert that:
 *
 *         - All returned summaries have is_active === false.
 *         - `inactiveReason.id` exists in `data`.
 *         - `activeReason.id` does NOT exist in `data`.
 *         - Pagination.records === data.length and records >= 1.
 * 5. Search with `is_active=null` to get combined view:
 *
 *    - Call PATCH /shoppingMall/admin/refundRequestReasons with body: { page: 1,
 *         limit: 50, is_active: null }.
 *    - Assert that:
 *
 *         - Both `activeReason.id` and `inactiveReason.id` can be found in the combined
 *                   result set (if backend default behavior includes both when
 *                   null is provided).
 *         - Pagination.records === data.length and records >= 2.
 */
export async function test_api_admin_refund_request_reason_search_active_vs_inactive(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain an authenticated admin context.
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create two refund request reasons with different is_active flags.
  const activeReasonBody = {
    code: `active_${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    applies_to_cancellation: true,
    applies_to_refund: true,
    is_active: true,
  } satisfies IShoppingMallRefundRequestReason.ICreate;

  const inactiveReasonBody = {
    code: `inactive_${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    applies_to_cancellation: true,
    applies_to_refund: true,
    is_active: false,
  } satisfies IShoppingMallRefundRequestReason.ICreate;

  const activeReason: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      { body: activeReasonBody },
    );
  typia.assert<IShoppingMallRefundRequestReason>(activeReason);

  const inactiveReason: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      { body: inactiveReasonBody },
    );
  typia.assert<IShoppingMallRefundRequestReason>(inactiveReason);

  // Helper: locate a reason by id in a list of summaries.
  const findSummaryById = (
    list: IShoppingMallRefundRequestReason.ISummary[],
    id: string,
  ): IShoppingMallRefundRequestReason.ISummary | undefined =>
    list.find((elem) => elem.id === id);

  // 3. Search with is_active=true.
  const activeSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: undefined,
    is_active: true,
    applies_to_refund: undefined,
    applies_to_cancellation: undefined,
    order_by: undefined,
    order_direction: undefined,
  } satisfies IShoppingMallRefundRequestReason.IRequest;

  const activePage: IPageIShoppingMallRefundRequestReason.ISummary =
    await api.functional.shoppingMall.admin.refundRequestReasons.index(
      connection,
      { body: activeSearchBody },
    );
  typia.assert<IPageIShoppingMallRefundRequestReason.ISummary>(activePage);

  // Validate that every returned record is active.
  await TestValidator.predicate(
    "all results have is_active=true when filtered with is_active=true",
    async () => activePage.data.every((reason) => reason.is_active === true),
  );

  const foundActiveInActiveSearch = findSummaryById(
    activePage.data,
    activeReason.id,
  );
  const foundInactiveInActiveSearch = findSummaryById(
    activePage.data,
    inactiveReason.id,
  );

  TestValidator.predicate(
    "active reason should be included when searching with is_active=true",
    foundActiveInActiveSearch !== undefined,
  );
  TestValidator.predicate(
    "inactive reason should NOT be included when searching with is_active=true",
    foundInactiveInActiveSearch === undefined,
  );

  TestValidator.equals(
    "pagination.records should match length of data when is_active=true",
    activePage.pagination.records,
    activePage.data.length,
  );
  TestValidator.predicate(
    "pagination.records should be >= 1 when is_active=true",
    activePage.pagination.records >= 1,
  );

  // 4. Search with is_active=false.
  const inactiveSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: undefined,
    is_active: false,
    applies_to_refund: undefined,
    applies_to_cancellation: undefined,
    order_by: undefined,
    order_direction: undefined,
  } satisfies IShoppingMallRefundRequestReason.IRequest;

  const inactivePage: IPageIShoppingMallRefundRequestReason.ISummary =
    await api.functional.shoppingMall.admin.refundRequestReasons.index(
      connection,
      { body: inactiveSearchBody },
    );
  typia.assert<IPageIShoppingMallRefundRequestReason.ISummary>(inactivePage);

  await TestValidator.predicate(
    "all results have is_active=false when filtered with is_active=false",
    async () => inactivePage.data.every((reason) => reason.is_active === false),
  );

  const foundActiveInInactiveSearch = findSummaryById(
    inactivePage.data,
    activeReason.id,
  );
  const foundInactiveInInactiveSearch = findSummaryById(
    inactivePage.data,
    inactiveReason.id,
  );

  TestValidator.predicate(
    "inactive reason should be included when searching with is_active=false",
    foundInactiveInInactiveSearch !== undefined,
  );
  TestValidator.predicate(
    "active reason should NOT be included when searching with is_active=false",
    foundActiveInInactiveSearch === undefined,
  );

  TestValidator.equals(
    "pagination.records should match length of data when is_active=false",
    inactivePage.pagination.records,
    inactivePage.data.length,
  );
  TestValidator.predicate(
    "pagination.records should be >= 1 when is_active=false",
    inactivePage.pagination.records >= 1,
  );

  // 5. Search with is_active=null to validate combined view.
  const combinedSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: undefined,
    is_active: null,
    applies_to_refund: undefined,
    applies_to_cancellation: undefined,
    order_by: undefined,
    order_direction: undefined,
  } satisfies IShoppingMallRefundRequestReason.IRequest;

  const combinedPage: IPageIShoppingMallRefundRequestReason.ISummary =
    await api.functional.shoppingMall.admin.refundRequestReasons.index(
      connection,
      { body: combinedSearchBody },
    );
  typia.assert<IPageIShoppingMallRefundRequestReason.ISummary>(combinedPage);

  const foundActiveInCombined = findSummaryById(
    combinedPage.data,
    activeReason.id,
  );
  const foundInactiveInCombined = findSummaryById(
    combinedPage.data,
    inactiveReason.id,
  );

  TestValidator.predicate(
    "active reason should be present in combined is_active=null search",
    foundActiveInCombined !== undefined,
  );
  TestValidator.predicate(
    "inactive reason should be present in combined is_active=null search",
    foundInactiveInCombined !== undefined,
  );

  TestValidator.equals(
    "pagination.records should match length of data when is_active=null",
    combinedPage.pagination.records,
    combinedPage.data.length,
  );
  TestValidator.predicate(
    "pagination.records should be >= 2 when is_active=null",
    combinedPage.pagination.records >= 2,
  );
}
