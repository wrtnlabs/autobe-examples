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
 * Validate basic pagination behavior of the admin catalog block reasons search
 * API.
 *
 * Business intent:
 *
 * - Ensure that an authenticated admin can retrieve catalog block reasons through
 *   PATCH /shoppingMall/admin/catalogBlockReasons.
 * - Confirm that default pagination behavior works when page/limit are omitted.
 * - Confirm that explicit pagination parameters (page, limit) are honored and
 *   reflected correctly in the pagination metadata and data length.
 *
 * Scenario steps:
 *
 * 1. Join as a new admin via POST /auth/admin/join, which also populates the
 *    Authorization header on the shared connection.
 * 2. Seed several catalog block reasons (e.g., 3) using POST
 *    /shoppingMall/admin/catalogBlockReasons with distinct
 *    code/name/severity_level.
 * 3. Call PATCH /shoppingMall/admin/catalogBlockReasons with an IRequest body that
 *    omits page and limit so that server defaults are applied.
 * 4. Validate type, then check that pagination metadata is sensible (non-negative
 *    current, positive limit) and that records is at least the number of seeded
 *    reasons. Verify that data contains entries matching the seeded reasons by
 *    code/name/severity_level when possible.
 * 5. Call PATCH again with explicit page = 0 and limit = 2.
 * 6. Validate type, then assert that pagination.current is 0, pagination.limit is
 *    2, and that data length respects the requested limit while being
 *    non-empty.
 */
export async function test_api_admin_catalog_block_reasons_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Join as a new admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);

  // 2. Seed several catalog block reasons (3 entries)
  const severities = ["low", "medium", "high"] as const;

  const createdReasons: IShoppingMallCatalogBlockReason[] = [];

  for (let i = 0; i < 3; i++) {
    const createBody = {
      code: `reason_${RandomGenerator.alphaNumeric(8)}_${i}`,
      name: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
      severity_level: severities[i],
    } satisfies IShoppingMallCatalogBlockReason.ICreate;

    const created =
      await api.functional.shoppingMall.admin.catalogBlockReasons.create(
        connection,
        {
          body: createBody,
        },
      );
    typia.assert(created);
    createdReasons.push(created);
  }

  // Helper to check if a page contains a specific created summary by code/name/severity
  const containsReason = (
    page: IPageIShoppingMallCatalogBlockReason.ISummary,
    reason: IShoppingMallCatalogBlockReason,
  ): boolean => {
    return page.data.some((summary) => {
      return (
        summary.code === reason.code &&
        summary.name === reason.name &&
        summary.severity_level === reason.severity_level
      );
    });
  };

  // 3. Call index with default pagination (omit page/limit)
  const defaultRequestBody = {
    // all fields optional; omit page/limit to use server defaults
  } satisfies IShoppingMallCatalogBlockReason.IRequest;

  const defaultPage =
    await api.functional.shoppingMall.admin.catalogBlockReasons.index(
      connection,
      {
        body: defaultRequestBody,
      },
    );
  typia.assert(defaultPage);

  // 4. Validate pagination metadata and presence of seeded reasons
  TestValidator.predicate(
    "default pagination current page is non-negative",
    defaultPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "default pagination limit is positive",
    defaultPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "default pagination records is at least number of created reasons",
    defaultPage.pagination.records >= createdReasons.length,
  );

  for (const reason of createdReasons) {
    TestValidator.predicate(
      `default page likely contains created reason code=${reason.code}`,
      containsReason(defaultPage, reason) ||
        defaultPage.pagination.records > defaultPage.data.length,
    );
  }

  // 5. Call index again with explicit page = 0 and limit = 2
  const explicitRequestBody = {
    page: 0,
    limit: 2,
  } satisfies IShoppingMallCatalogBlockReason.IRequest;

  const limitedPage =
    await api.functional.shoppingMall.admin.catalogBlockReasons.index(
      connection,
      {
        body: explicitRequestBody,
      },
    );
  typia.assert(limitedPage);

  // 6. Validate explicit pagination behavior
  TestValidator.predicate(
    "explicit pagination current page is 0",
    limitedPage.pagination.current === 0,
  );
  TestValidator.predicate(
    "explicit pagination limit is 2",
    limitedPage.pagination.limit === 2,
  );
  TestValidator.predicate(
    "explicit pagination data length is > 0 and <= limit",
    limitedPage.data.length > 0 &&
      limitedPage.data.length <= limitedPage.pagination.limit,
  );
}
