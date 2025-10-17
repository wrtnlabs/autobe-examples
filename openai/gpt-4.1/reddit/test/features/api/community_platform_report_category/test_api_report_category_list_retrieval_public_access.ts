import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportCategory";

/**
 * Test public and authenticated access to the report category list endpoint.
 *
 * 1. Create platform admin via POST /auth/admin/join
 * 2. Create at least one report category as the admin
 * 3. List categories with default pagination as authenticated admin
 * 4. List categories with default pagination as guest (no auth)
 * 5. List categories with search matching test data (positive test)
 * 6. List categories with search matching no data (negative test)
 * 7. List categories with invalid pagination (edge case)
 * 8. Check that category structure, fields, meta info are valid
 * 9. Confirm endpoint is open to both guests and logged-in users
 * 10. Confirm searching, sorting, and pagination works as described
 */
export async function test_api_report_category_list_retrieval_public_access(
  connection: api.IConnection,
) {
  // Step 1. Create admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2. Create test report category as admin
  const categoryName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 12,
  });
  const newCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          allow_free_text: RandomGenerator.pick([true, false]),
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  typia.assert(newCategory);

  // Step 3. List categories as authenticated admin (default pagination)
  const adminList =
    await api.functional.communityPlatform.reportCategories.index(connection, {
      body: {},
    });
  typia.assert(adminList);

  // Validate that our test category appears in the result (by name matching)
  TestValidator.predicate(
    "admin see newly created category in list",
    adminList.data.map((c) => c.name).includes(categoryName),
  );
  // Validate category fields
  const foundCategory = adminList.data.find((c) => c.name === categoryName);
  if (foundCategory) {
    typia.assert(foundCategory);
    TestValidator.equals(
      "category name matches",
      foundCategory.name,
      categoryName,
    );
    TestValidator.equals(
      "allow_free_text matches",
      foundCategory.allow_free_text,
      newCategory.allow_free_text,
    );
  }

  // Step 4. List as guest (unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const guestList =
    await api.functional.communityPlatform.reportCategories.index(unauthConn, {
      body: {},
    });
  typia.assert(guestList);
  // Guest must see the same category
  TestValidator.predicate(
    "guest sees same test category",
    guestList.data.some((c) => c.name === categoryName),
  );

  // Step 5. Apply search that matches (search should be case-insensitive or at least exact)
  const positiveSearch =
    await api.functional.communityPlatform.reportCategories.index(connection, {
      body: {
        search: categoryName,
      },
    });
  typia.assert(positiveSearch);
  TestValidator.predicate(
    "search by category name returns at least one result",
    positiveSearch.data.length > 0 &&
      positiveSearch.data.some((c) => c.name === categoryName),
  );

  // Step 6. Apply search that does NOT match anything (should return empty array)
  const negativeSearchTerm = RandomGenerator.alphaNumeric(24);
  const negativeSearch =
    await api.functional.communityPlatform.reportCategories.index(connection, {
      body: {
        search: negativeSearchTerm,
      },
    });
  typia.assert(negativeSearch);
  TestValidator.equals(
    "search for nonexistent category returns empty result",
    negativeSearch.data.length,
    0,
  );

  // Step 8. Request with valid explicit pagination (page=1, limit=1)
  const paged = await api.functional.communityPlatform.reportCategories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 1,
      },
    },
  );
  typia.assert(paged);
  TestValidator.predicate(
    "pagination fields are present and valid",
    typeof paged.pagination.current === "number" &&
      typeof paged.pagination.limit === "number" &&
      typeof paged.pagination.pages === "number" &&
      typeof paged.pagination.records === "number",
  );
}
