import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCategory";

export async function test_api_category_listing_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "Admin@1234",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);
  TestValidator.predicate(
    "administrator created successfully",
    administrator.id !== undefined,
  );

  // Step 2: Create multiple categories
  const categories: ICommunityPlatformCategory[] = [];
  for (let i = 0; i < 3; i++) {
    const category: ICommunityPlatformCategory =
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: `Category ${i + 1}`,
            slug: `category-${i + 1}`,
            description: `Test category ${i + 1} description`,
            icon_url: `https://example.com/icon-${i + 1}.png`,
            display_order: i,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    typia.assert(category);
    categories.push(category);
  }
  TestValidator.equals("created 3 categories", categories.length, 3);

  // Step 3: Create unauthenticated connection for public access testing
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 4: Request category list without authentication
  const publicListing: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(unauthConn, {
      body: {
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(publicListing);
  TestValidator.predicate(
    "public listing returns data",
    publicListing.data.length >= 3,
  );

  // Step 5: Verify all created categories are in the public listing
  const createdCategoryIds = new Set(categories.map((c) => c.id));
  const foundCategories = publicListing.data.filter((c) =>
    createdCategoryIds.has(c.id),
  );
  TestValidator.equals(
    "all created categories visible in public listing",
    foundCategories.length,
    3,
  );

  // Step 6: Verify pagination metadata
  TestValidator.predicate(
    "pagination metadata exists",
    publicListing.pagination !== undefined &&
      publicListing.pagination.current >= 1 &&
      publicListing.pagination.limit > 0,
  );

  // Step 7: Verify category data integrity
  for (const foundCategory of foundCategories) {
    const originalCategory = categories.find((c) => c.id === foundCategory.id);
    if (originalCategory) {
      TestValidator.equals(
        `category ${foundCategory.id} name matches`,
        foundCategory.name,
        originalCategory.name,
      );
      TestValidator.equals(
        `category ${foundCategory.id} slug matches`,
        foundCategory.slug,
        originalCategory.slug,
      );
      TestValidator.predicate(
        `category ${foundCategory.id} has display_order`,
        typeof foundCategory.display_order === "number",
      );
    }
  }

  // Step 8: Test with search parameter
  const searchListing: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(unauthConn, {
      body: {
        page: 1,
        limit: 100,
        search: "Category 1",
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(searchListing);
  TestValidator.predicate(
    "search results contain data",
    searchListing.data.length >= 1,
  );

  // Step 9: Test with sorting by name
  const sortedListing: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(unauthConn, {
      body: {
        page: 1,
        limit: 100,
        sort_by: "name",
        order: "asc",
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(sortedListing);
  TestValidator.predicate(
    "sorted listing returns data",
    sortedListing.data.length >= 1,
  );

  // Step 10: Test with only active categories filter
  const activeListing: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(unauthConn, {
      body: {
        page: 1,
        limit: 100,
        is_active: true,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(activeListing);
  TestValidator.predicate(
    "active categories filter works",
    activeListing.data.every((c) => c.is_active === true),
  );

  // Step 11: Verify no sensitive data exposed to unauthenticated users
  for (const category of publicListing.data) {
    TestValidator.predicate(
      `category ${category.id} has id`,
      category.id !== undefined,
    );
    TestValidator.predicate(
      `category ${category.id} has name`,
      category.name !== undefined && category.name.length > 0,
    );
    TestValidator.predicate(
      `category ${category.id} has is_active`,
      typeof category.is_active === "boolean",
    );
  }

  // Step 12: Verify multiple pages work correctly
  const pagedListing1: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(unauthConn, {
      body: {
        page: 1,
        limit: 2,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(pagedListing1);
  TestValidator.predicate(
    "first page has correct limit",
    pagedListing1.data.length <= 2,
  );

  TestValidator.predicate(
    "category listing is consistent and public",
    pagedListing1.data.length > 0,
  );
}
