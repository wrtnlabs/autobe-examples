import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPermission";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPermission";

/**
 * Verify admin permission search date range filters for creation and update
 * timestamps.
 *
 * Business goal: Ensure that the admin permission catalog search endpoint
 * correctly honors created_from/created_to and updated_from/updated_to filters,
 * returning only permissions whose lifecycle timestamps fall within the
 * specified inclusive ISO 8601 date-time ranges. Also verify that unrelated
 * permissions are not included and that pagination metadata remains consistent
 * with the filtered result set.
 *
 * High level flow:
 *
 * 1. Register a new admin using POST /auth/admin/join; SDK:
 *    api.functional.auth.admin.join.
 *
 *    - This call also wires Authorization header into the provided connection.
 * 2. Create two distinct permissions via POST /shoppingMall/admin/adminPermissions
 *    using api.functional.shoppingMall.admin.adminPermissions.create.
 *
 *    - Control their codes/names so they are easy to distinguish.
 *    - Capture their created_at and updated_at timestamps from the responses.
 * 3. Build several date-time windows around the two permissions:
 *
 *    - Use typia.assert() to ensure permission DTOs and page responses are valid.
 *    - Construct ISO date-time strings based on the returned created_at/updated_at
 *         values rather than system time, to avoid clock skew issues.
 * 4. Call PATCH /shoppingMall/admin/adminPermissions (index) with
 *    created_from/created_to so that only the first permission is included.
 * 5. Repeat with a window that only includes the second permission.
 * 6. Build a combined window that includes both permissions and verify that both
 *    appear.
 * 7. Mirror the above tests using updated_from/updated_to instead of
 *    created_from/created_to, relying on the fact that updated_at initially
 *    equals created_at in this system (no explicit update endpoint here).
 * 8. For each search, verify:
 *
 *    - Response type matches IPageIShoppingMallAdminPermission.ISummary via
 *         typia.assert.
 *    - Pagination metadata is consistent with actual data length (records >=
 *         data.length, limit >= data.length, and current page index is 1 when
 *         using page=1).
 *    - Only the expected permission IDs are present and no extra items slip in.
 */
export async function test_api_admin_permission_search_with_created_and_updated_date_ranges(
  connection: api.IConnection,
) {
  // 1. Admin registration (join) to obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // For simplicity, use deterministic but valid URIs for href/referrer
    href: "https://admin-console.example.com/join",
    referrer: "https://admin-console.example.com/login",
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create two distinct permissions
  const baseCodePrefix = `e2e.permission.${RandomGenerator.alphaNumeric(8)}`;

  const firstPermissionBody = {
    code: `${baseCodePrefix}.first`,
    name: "E2E First Permission",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    category: "e2e-category",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;

  const firstPermission: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      {
        body: firstPermissionBody,
      },
    );
  typia.assert<IShoppingMallAdminPermission>(firstPermission);

  const secondPermissionBody = {
    code: `${baseCodePrefix}.second`,
    name: "E2E Second Permission",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    category: "e2e-category",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;

  const secondPermission: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      {
        body: secondPermissionBody,
      },
    );
  typia.assert<IShoppingMallAdminPermission>(secondPermission);

  // Ensure timestamps are well-formed
  const firstCreatedAt = firstPermission.created_at;
  const secondCreatedAt = secondPermission.created_at;
  const firstUpdatedAt = firstPermission.updated_at;
  const secondUpdatedAt = secondPermission.updated_at;

  typia.assert<string & tags.Format<"date-time">>(firstCreatedAt);
  typia.assert<string & tags.Format<"date-time">>(secondCreatedAt);
  typia.assert<string & tags.Format<"date-time">>(firstUpdatedAt);
  typia.assert<string & tags.Format<"date-time">>(secondUpdatedAt);

  // Helper function to parse ISO and add/subtract seconds for range bracketing
  const shiftSeconds = (iso: string, deltaSeconds: number): string => {
    const base = new Date(iso);
    const shifted = new Date(base.getTime() + deltaSeconds * 1000);
    return shifted.toISOString();
  };

  // Construct windows around first permission created_at
  const firstCreatedFromOnly = shiftSeconds(firstCreatedAt, -5);
  const firstCreatedToOnly = shiftSeconds(firstCreatedAt, +5);

  // Construct windows around second permission created_at
  const secondCreatedFromOnly = shiftSeconds(secondCreatedAt, -5);
  const secondCreatedToOnly = shiftSeconds(secondCreatedAt, +5);

  // Combined window that should include both permissions
  const combinedCreatedFrom =
    firstCreatedAt <= secondCreatedAt
      ? firstCreatedFromOnly
      : secondCreatedFromOnly;
  const combinedCreatedTo =
    firstCreatedAt <= secondCreatedAt
      ? secondCreatedToOnly
      : firstCreatedToOnly;

  // 4. Query with created_* window containing only first permission
  const createdFirstPage: IPageIShoppingMallAdminPermission.ISummary =
    await api.functional.shoppingMall.admin.adminPermissions.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        created_from: firstCreatedFromOnly,
        created_to: firstCreatedToOnly,
        include_deleted: false,
      } satisfies IShoppingMallAdminPermission.IRequest,
    });
  typia.assert<IPageIShoppingMallAdminPermission.ISummary>(createdFirstPage);

  // Basic pagination sanity checks
  TestValidator.predicate(
    "created-first page records >= data length",
    createdFirstPage.pagination.records >= createdFirstPage.data.length,
  );
  TestValidator.predicate(
    "created-first page limit >= data length",
    createdFirstPage.pagination.limit >= createdFirstPage.data.length,
  );
  TestValidator.equals(
    "created-first current page is 1",
    createdFirstPage.pagination.current,
    1,
  );

  // Expect only first permission within this narrow window
  const createdFirstIds = createdFirstPage.data.map((p) => p.id);
  TestValidator.predicate(
    "created-first includes first permission id",
    createdFirstIds.includes(firstPermission.id),
  );

  if (createdFirstIds.length > 1) {
    TestValidator.equals(
      "created-first page should not include second permission id",
      createdFirstIds.includes(secondPermission.id),
      false,
    );
  }

  // 6. Query with created_* window containing only second permission
  const createdSecondPage: IPageIShoppingMallAdminPermission.ISummary =
    await api.functional.shoppingMall.admin.adminPermissions.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        created_from: secondCreatedFromOnly,
        created_to: secondCreatedToOnly,
        include_deleted: false,
      } satisfies IShoppingMallAdminPermission.IRequest,
    });
  typia.assert<IPageIShoppingMallAdminPermission.ISummary>(createdSecondPage);

  TestValidator.predicate(
    "created-second page records >= data length",
    createdSecondPage.pagination.records >= createdSecondPage.data.length,
  );
  TestValidator.predicate(
    "created-second page limit >= data length",
    createdSecondPage.pagination.limit >= createdSecondPage.data.length,
  );
  TestValidator.equals(
    "created-second current page is 1",
    createdSecondPage.pagination.current,
    1,
  );

  const createdSecondIds = createdSecondPage.data.map((p) => p.id);
  TestValidator.predicate(
    "created-second includes second permission id",
    createdSecondIds.includes(secondPermission.id),
  );

  if (createdSecondIds.length > 1) {
    TestValidator.equals(
      "created-second page should not include first permission id",
      createdSecondIds.includes(firstPermission.id),
      false,
    );
  }

  // 6b. Combined created_* window that should include both permissions
  const createdCombinedPage: IPageIShoppingMallAdminPermission.ISummary =
    await api.functional.shoppingMall.admin.adminPermissions.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        created_from: combinedCreatedFrom,
        created_to: combinedCreatedTo,
        include_deleted: false,
      } satisfies IShoppingMallAdminPermission.IRequest,
    });
  typia.assert<IPageIShoppingMallAdminPermission.ISummary>(createdCombinedPage);

  const createdCombinedIds = createdCombinedPage.data.map((p) => p.id);
  TestValidator.predicate(
    "created-combined includes first permission id",
    createdCombinedIds.includes(firstPermission.id),
  );
  TestValidator.predicate(
    "created-combined includes second permission id",
    createdCombinedIds.includes(secondPermission.id),
  );

  // 7. Repeat similar checks for updated_from/updated_to windows
  const firstUpdatedFromOnly = shiftSeconds(firstUpdatedAt, -5);
  const firstUpdatedToOnly = shiftSeconds(firstUpdatedAt, +5);
  const secondUpdatedFromOnly = shiftSeconds(secondUpdatedAt, -5);
  const secondUpdatedToOnly = shiftSeconds(secondUpdatedAt, +5);

  const combinedUpdatedFrom =
    firstUpdatedAt <= secondUpdatedAt
      ? firstUpdatedFromOnly
      : secondUpdatedFromOnly;
  const combinedUpdatedTo =
    firstUpdatedAt <= secondUpdatedAt
      ? secondUpdatedToOnly
      : firstUpdatedToOnly;

  const updatedFirstPage: IPageIShoppingMallAdminPermission.ISummary =
    await api.functional.shoppingMall.admin.adminPermissions.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        updated_from: firstUpdatedFromOnly,
        updated_to: firstUpdatedToOnly,
        include_deleted: false,
      } satisfies IShoppingMallAdminPermission.IRequest,
    });
  typia.assert<IPageIShoppingMallAdminPermission.ISummary>(updatedFirstPage);

  const updatedFirstIds = updatedFirstPage.data.map((p) => p.id);
  TestValidator.predicate(
    "updated-first includes first permission id",
    updatedFirstIds.includes(firstPermission.id),
  );

  if (updatedFirstIds.length > 1) {
    TestValidator.equals(
      "updated-first page should not include second permission id",
      updatedFirstIds.includes(secondPermission.id),
      false,
    );
  }

  const updatedSecondPage: IPageIShoppingMallAdminPermission.ISummary =
    await api.functional.shoppingMall.admin.adminPermissions.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        updated_from: secondUpdatedFromOnly,
        updated_to: secondUpdatedToOnly,
        include_deleted: false,
      } satisfies IShoppingMallAdminPermission.IRequest,
    });
  typia.assert<IPageIShoppingMallAdminPermission.ISummary>(updatedSecondPage);

  const updatedSecondIds = updatedSecondPage.data.map((p) => p.id);
  TestValidator.predicate(
    "updated-second includes second permission id",
    updatedSecondIds.includes(secondPermission.id),
  );

  if (updatedSecondIds.length > 1) {
    TestValidator.equals(
      "updated-second page should not include first permission id",
      updatedSecondIds.includes(firstPermission.id),
      false,
    );
  }

  const updatedCombinedPage: IPageIShoppingMallAdminPermission.ISummary =
    await api.functional.shoppingMall.admin.adminPermissions.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        updated_from: combinedUpdatedFrom,
        updated_to: combinedUpdatedTo,
        include_deleted: false,
      } satisfies IShoppingMallAdminPermission.IRequest,
    });
  typia.assert<IPageIShoppingMallAdminPermission.ISummary>(updatedCombinedPage);

  const updatedCombinedIds = updatedCombinedPage.data.map((p) => p.id);
  TestValidator.predicate(
    "updated-combined includes first permission id",
    updatedCombinedIds.includes(firstPermission.id),
  );
  TestValidator.predicate(
    "updated-combined includes second permission id",
    updatedCombinedIds.includes(secondPermission.id),
  );
}
