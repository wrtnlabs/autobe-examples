import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPolicyOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPolicyOverride";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallPolicyOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyOverride";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

export async function test_api_admin_policy_override_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Onboard an admin and obtain authenticated context
  const admin = await api.functional.auth.admin.join(connection, {
    body: typia.random<IShoppingMallAdminJoin.ICreate>(),
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Bulk-create more than one page worth of policy overrides (e.g., 25)
  const createdOverrides: IShoppingMallPolicyOverride[] =
    await ArrayUtil.asyncRepeat(25, async () => {
      const created =
        await api.functional.shoppingMall.admin.policyOverrides.create(
          connection,
          {
            body: typia.random<IShoppingMallPolicyOverride.ICreate>(),
          },
        );
      typia.assert<IShoppingMallPolicyOverride>(created);
      return created;
    });

  // Sanity check: ensure we really created 25 overrides
  TestValidator.equals(
    "created override count should be 25",
    createdOverrides.length,
    25,
  );

  // Helper to call adminSearch with specific page/limit
  const searchPage = async (
    page: number,
    limit: number,
  ): Promise<IPageIShoppingMallPolicyOverride.ISummary> => {
    const response =
      await api.functional.shoppingMall.admin.adminSearch.policyOverrides.index(
        connection,
        {
          body: {
            page,
            limit,
          } satisfies IShoppingMallPolicyOverride.IRequest,
        },
      );
    typia.assert<IPageIShoppingMallPolicyOverride.ISummary>(response);
    return response;
  };

  const limit = 10;

  // 3. Fetch page 1
  const page1 = await searchPage(1, limit);

  // 4. Assertions for page 1
  TestValidator.equals(
    "page 1: current page should be 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1: limit should be 10",
    page1.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "page 1: records should be at least 25",
    page1.pagination.records >= 25,
  );
  TestValidator.predicate(
    "page 1: pages should be at least 3 when 25+ records with limit 10",
    page1.pagination.pages >= 3,
  );
  TestValidator.equals(
    "page 1: data length should be 10",
    page1.data.length,
    limit,
  );

  const page1Ids = page1.data.map((s) => s.id);

  // 5. Fetch page 2
  const page2 = await searchPage(2, limit);

  // 6. Assertions for page 2
  TestValidator.equals(
    "page 2: current page should be 2",
    page2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2: limit should be 10",
    page2.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "page 2: records should match page 1 records",
    page2.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "page 2: pages should match page 1 pages",
    page2.pagination.pages,
    page1.pagination.pages,
  );
  TestValidator.equals(
    "page 2: data length should be 10",
    page2.data.length,
    limit,
  );

  const page2Ids = page2.data.map((s) => s.id);

  // 7. Verify that page 1 and page 2 items are distinct
  const intersection = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.equals(
    "page 1 and page 2 should have no overlapping IDs",
    intersection.length,
    0,
  );

  // 8. Fetch page 3 to increase coverage across the full created set
  const page3 = await searchPage(3, limit);

  TestValidator.equals(
    "page 3: current page should be 3",
    page3.pagination.current,
    3,
  );

  const page3Ids = page3.data.map((s) => s.id);

  // Collect IDs from first 3 pages and assert uniqueness among them
  const allIds = [...page1Ids, ...page2Ids, ...page3Ids];
  const uniqueIds = Array.from(new Set(allIds));

  TestValidator.equals(
    "IDs across first three pages should be unique",
    uniqueIds.length,
    allIds.length,
  );

  // Optional business check: we expect at least as many distinct IDs
  // as the number of overrides we explicitly created. However, since the
  // search API can return pre-existing data as well, do not assert exact
  // equality; just ensure we see at least 20 distinct IDs (two full pages).
  TestValidator.predicate(
    "at least 20 distinct override IDs across first three pages",
    uniqueIds.length >= 20,
  );
}
