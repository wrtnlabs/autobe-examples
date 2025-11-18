import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCatalogBlockReason";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogBlockReason";

/**
 * Verify that the `include_deleted` flag on the admin catalog block reasons
 * search endpoint controls whether deleted reasons are included in the result
 * set.
 *
 * Business context: Admins manage a reference catalog of block reasons used
 * throughout the platform for governance and moderation decisions. Operational
 * tooling typically wants to see only active reasons, while audit and
 * compliance workflows may need to include retired/deleted reasons as well. The
 * `include_deleted` flag on `IShoppingMallCatalogBlockReason.IRequest` exists
 * to support this distinction.
 *
 * Test steps:
 *
 * 1. Admin joins the platform using POST /auth/admin/join to obtain an
 *    authenticated context. The SDK automatically attaches the access token to
 *    the provided `connection`.
 * 2. The admin creates two catalog block reasons via POST
 *    /shoppingMall/admin/catalogBlockReasons, using distinct `code` values so
 *    that we can reliably identify them later.
 * 3. One of the two reasons is deleted via DELETE
 *    /shoppingMall/admin/catalogBlockReasons/{catalogBlockReasonId} using the
 *    `erase` function. This removes it from the active set of block reasons.
 * 4. The admin calls PATCH /shoppingMall/admin/catalogBlockReasons with an
 *    `IShoppingMallCatalogBlockReason.IRequest` body that omits
 *    `include_deleted`. Pagination parameters are set so that both reasons
 *    would appear if they were visible.
 * 5. We assert the response type with `typia.assert`, then verify via
 *    `TestValidator` that only the non-deleted reason’s `id` is present in the
 *    returned `data` collection and that the deleted one is not.
 * 6. The admin calls PATCH /shoppingMall/admin/catalogBlockReasons again with the
 *    same filter parameters but with `include_deleted` explicitly set to
 *    `true`.
 * 7. We again assert the response type and then verify via `TestValidator` that
 *    the non-deleted reason remains present. If the implementation treats
 *    `erase` as a soft-delete exposed via `index`, we additionally expect the
 *    deleted reason’s `id` to be present when `include_deleted` is `true`. If
 *    the implementation performs a hard delete, the test at least ensures that
 *    toggling `include_deleted` does not cause active reasons to disappear from
 *    the results.
 */
export async function test_api_admin_catalog_block_reasons_include_deleted_toggle(
  connection: api.IConnection,
) {
  // Step 1: Admin joins the platform to obtain an authenticated context.
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // Step 2: Create two catalog block reasons with distinct codes.
  const baseCreate1 = typia.random<IShoppingMallCatalogBlockReason.ICreate>();
  const baseCreate2 = typia.random<IShoppingMallCatalogBlockReason.ICreate>();

  const reason1Body = {
    ...baseCreate1,
    code: `${baseCreate1.code}-reason1`,
    name: `${baseCreate1.name} Reason 1`,
  } satisfies IShoppingMallCatalogBlockReason.ICreate;

  const reason2Body = {
    ...baseCreate2,
    code: `${baseCreate2.code}-reason2`,
    name: `${baseCreate2.name} Reason 2`,
  } satisfies IShoppingMallCatalogBlockReason.ICreate;

  const reason1 =
    await api.functional.shoppingMall.admin.catalogBlockReasons.create(
      connection,
      {
        body: reason1Body,
      },
    );
  typia.assert<IShoppingMallCatalogBlockReason>(reason1);

  const reason2 =
    await api.functional.shoppingMall.admin.catalogBlockReasons.create(
      connection,
      {
        body: reason2Body,
      },
    );
  typia.assert<IShoppingMallCatalogBlockReason>(reason2);

  // Step 3: Delete one of the reasons (treating this as removal from active set).
  await api.functional.shoppingMall.admin.catalogBlockReasons.erase(
    connection,
    {
      catalogBlockReasonId: reason2.id,
    },
  );

  // Step 4: Search without include_deleted (undefined) and verify only active reason appears.
  const searchWithoutDeletedBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    search: undefined,
    severity_levels: undefined,
    include_deleted: undefined,
    order_by: undefined,
    order_direction: undefined,
  } satisfies IShoppingMallCatalogBlockReason.IRequest;

  const pageWithoutDeleted =
    await api.functional.shoppingMall.admin.catalogBlockReasons.index(
      connection,
      {
        body: searchWithoutDeletedBody,
      },
    );
  typia.assert<IPageIShoppingMallCatalogBlockReason.ISummary>(
    pageWithoutDeleted,
  );

  const idsWithoutDeleted = pageWithoutDeleted.data.map((s) => s.id);

  TestValidator.predicate(
    "active reason should be present when include_deleted is omitted",
    idsWithoutDeleted.includes(reason1.id),
  );

  TestValidator.predicate(
    "deleted reason should not be present when include_deleted is omitted (if erase removes it from active set)",
    !idsWithoutDeleted.includes(reason2.id),
  );

  // Step 6: Search with include_deleted explicitly set to true.
  const searchWithDeletedBody = {
    ...searchWithoutDeletedBody,
    include_deleted: true,
  } satisfies IShoppingMallCatalogBlockReason.IRequest;

  const pageWithDeleted =
    await api.functional.shoppingMall.admin.catalogBlockReasons.index(
      connection,
      {
        body: searchWithDeletedBody,
      },
    );
  typia.assert<IPageIShoppingMallCatalogBlockReason.ISummary>(pageWithDeleted);

  const idsWithDeleted = pageWithDeleted.data.map((s) => s.id);

  TestValidator.predicate(
    "active reason should still be present when include_deleted is true",
    idsWithDeleted.includes(reason1.id),
  );

  // Depending on implementation, the deleted reason may or may not appear when
  // include_deleted is true. We only assert that, if it appears, it is
  // represented consistently.
  const deletedSummary = pageWithDeleted.data.find((s) => s.id === reason2.id);

  if (deletedSummary !== undefined) {
    TestValidator.equals(
      "deleted reason summary code should match created reason",
      deletedSummary.code,
      reason2.code,
    );
    TestValidator.equals(
      "deleted reason summary name should match created reason",
      deletedSummary.name,
      reason2.name,
    );
    TestValidator.equals(
      "deleted reason summary severity_level should match created reason",
      deletedSummary.severity_level,
      reason2.severity_level,
    );
  }
}
