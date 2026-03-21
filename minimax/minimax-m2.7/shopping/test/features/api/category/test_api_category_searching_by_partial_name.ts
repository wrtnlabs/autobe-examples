import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_category_searching_by_partial_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://example.com/admin",
      referrer: "https://example.com",
    },
  });
  // 2. Search categories by partial name "Electronics"
  // This should return categories containing "Electronics" in their name
  // Note: The test assumes categories with names containing "Electronics" exist
  // in the test database. Categories like "Electronics", "Home Electronics", etc.
  // should be returned, while unrelated categories like "Kitchen Appliances" should not.
  // Test case 1: Search with "Electronics" - partial match
  const electronicsResult =
    await api.functional.ecommerceMall.admin.categories.index(adminConnection, {
      body: {
        name: "Electronics",
        limit: 100,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(electronicsResult);
  // Validate response structure
  TestValidator.equals(
    "has pagination",
    electronicsResult.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "has data or empty array",
    Array.isArray(electronicsResult.data),
  );
  // If there are categories returned, verify they all contain "Electronics" (case-insensitive)
  for (const category of electronicsResult.data) {
    TestValidator.predicate(
      `category "${category.name}" contains "Electronics" (case-insensitive)`,
      category.name.toLowerCase().includes("electronics"),
    );
  }
  // Test case 2: Search with lowercase "electronics" - case-insensitive test
  const lowercaseResult =
    await api.functional.ecommerceMall.admin.categories.index(adminConnection, {
      body: {
        name: "electronics",
        limit: 100,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(lowercaseResult);
  // Results should be the same regardless of case
  TestValidator.equals(
    "case-insensitive search returns same count",
    lowercaseResult.data.length,
    electronicsResult.data.length,
  );
  // Test case 3: Search with uppercase "ELECTRONICS" - case-insensitive test
  const uppercaseResult =
    await api.functional.ecommerceMall.admin.categories.index(adminConnection, {
      body: {
        name: "ELECTRONICS",
        limit: 100,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(uppercaseResult);
  TestValidator.equals(
    "uppercase search returns same count",
    uppercaseResult.data.length,
    electronicsResult.data.length,
  );
  // Test case 4: Search with partial term "Elect" - shorter partial match
  const partialResult =
    await api.functional.ecommerceMall.admin.categories.index(adminConnection, {
      body: {
        name: "Elect",
        limit: 100,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(partialResult);
  // All returned categories should contain "Elect" (partial match)
  for (const category of partialResult.data) {
    TestValidator.predicate(
      `category "${category.name}" contains "Elect"`,
      category.name.toLowerCase().includes("elect"),
    );
  }
  // Test case 5: Search with unrelated term - should return empty or no matches
  const unrelatedResult =
    await api.functional.ecommerceMall.admin.categories.index(adminConnection, {
      body: {
        name: "NonexistentCategoryXYZ123",
        limit: 100,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(unrelatedResult);
  TestValidator.predicate(
    "unrelated search returns empty results",
    unrelatedResult.data.length === 0,
  );
  // Test case 6: Pagination works with name search
  const paginatedResult =
    await api.functional.ecommerceMall.admin.categories.index(adminConnection, {
      body: {
        name: "Electronics",
        limit: 2,
        page: 1,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(paginatedResult);
  TestValidator.equals(
    "limit is respected",
    paginatedResult.pagination.limit,
    2,
  );
  TestValidator.equals(
    "page is respected",
    paginatedResult.pagination.current,
    1,
  );
}
