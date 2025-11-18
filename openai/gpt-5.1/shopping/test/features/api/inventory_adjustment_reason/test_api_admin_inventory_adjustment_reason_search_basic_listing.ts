import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryAdjustmentReason";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustmentReason";

/**
 * Basic admin listing of inventory adjustment reasons.
 *
 * Business purpose:
 *
 * - Ensure that an authenticated shopping mall admin can:
 *
 *   - Join the platform (admin join flow).
 *   - Create at least one inventory adjustment reason master record.
 *   - Retrieve a paginated list of inventory adjustment reasons via the admin
 *       search endpoint using default/minimal filters.
 *   - Observe that the created reason appears in the listing as a summary item, and
 *       that pagination metadata is self-consistent.
 *
 * Steps:
 *
 * 1. Register a fresh admin via POST /auth/admin/join and let the SDK attach the
 *    admin JWT access token to the connection.
 * 2. As this admin, create a new inventory adjustment reason using POST
 *    /shoppingMall/admin/inventoryAdjustmentReasons.
 * 3. Call PATCH /shoppingMall/admin/inventoryAdjustmentReasons with an empty
 *    IRequest body to fetch the first page with default server pagination and
 *    sorting.
 * 4. Validate the response type and pagination metadata.
 * 5. Assert that at least one summary exists and that the created reason is
 *    present in the data array by id/code/name.
 * 6. Rely on ISummary typing and typia.assert to ensure that summary entries
 *    expose only id/code/name and no internal columns.
 */
export async function test_api_admin_inventory_adjustment_reason_search_basic_listing(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authenticated context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new inventory adjustment reason as this admin
  const reasonCode = `ADJUST_${RandomGenerator.alphaNumeric(8)}`;
  const reasonName = RandomGenerator.paragraph({ sentences: 2 });
  const reasonDescription = RandomGenerator.paragraph({ sentences: 4 });

  const createBody = {
    code: reasonCode,
    name: reasonName,
    description: reasonDescription,
    direction: "increase",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const createdReason: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdReason);

  // 3. Call index endpoint with minimal/default filters (empty IRequest body)
  const indexBody =
    {} satisfies IShoppingMallInventoryAdjustmentReason.IRequest;

  const page: IPageIShoppingMallInventoryAdjustmentReason.ISummary =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.index(
      connection,
      {
        body: indexBody,
      },
    );
  typia.assert<IPageIShoppingMallInventoryAdjustmentReason.ISummary>(page);

  const pagination: IPage.IPagination = page.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // 4. Basic pagination consistency checks
  TestValidator.predicate(
    "pagination.current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    pagination.pages >= 0,
  );

  if (pagination.records === 0) {
    TestValidator.equals(
      "no records implies empty data array",
      page.data.length,
      0,
    );
    TestValidator.equals("no records implies zero pages", pagination.pages, 0);
  } else {
    TestValidator.predicate(
      "records > 0 implies some data",
      page.data.length > 0,
    );
    TestValidator.predicate(
      "records > 0 implies at least one page",
      pagination.pages >= 1,
    );
  }

  if (pagination.limit > 0) {
    TestValidator.predicate(
      "page size does not exceed limit when limit > 0",
      page.data.length <= pagination.limit,
    );
  }

  // 5. Ensure we have at least one summary (given we just created one)
  TestValidator.predicate(
    "listing returns at least one inventory adjustment reason summary",
    page.data.length >= 1,
  );

  // 6. Verify created reason appears in the summary list by id/code/name
  const matchedSummary = page.data.find(
    (summary) =>
      summary.id === createdReason.id &&
      summary.code === createdReason.code &&
      summary.name === createdReason.name,
  );

  TestValidator.predicate(
    "created inventory adjustment reason appears in summary listing",
    matchedSummary !== undefined,
  );

  if (matchedSummary !== undefined) {
    // Confirm summary structure strictly follows ISummary (id, code, name)
    typia.assert<IShoppingMallInventoryAdjustmentReason.ISummary>(
      matchedSummary,
    );
    TestValidator.equals(
      "summary id matches created reason id",
      matchedSummary.id,
      createdReason.id,
    );
    TestValidator.equals(
      "summary code matches created reason code",
      matchedSummary.code,
      createdReason.code,
    );
    TestValidator.equals(
      "summary name matches created reason name",
      matchedSummary.name,
      createdReason.name,
    );
  }
}
