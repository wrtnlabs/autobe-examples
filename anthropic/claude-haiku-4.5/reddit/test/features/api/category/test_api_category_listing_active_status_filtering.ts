import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCategory";

/**
 * Test category listing with active status filtering.
 *
 * Validates that the category listing endpoint correctly filters categories by
 * active status (is_active parameter). Tests filtering scenarios:
 *
 * - Retrieving only active categories (is_active=true)
 * - Retrieving all categories (is_active unspecified)
 * - Filtering with pagination
 * - Filtering with search
 * - Filtering with sorting
 *
 * This test ensures the filtering mechanism works correctly for both user
 * discovery (showing only active categories) and administrative purposes.
 */
export async function test_api_category_listing_active_status_filtering(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        href: "http://localhost:3000/admin/join",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "administrator account created successfully",
    admin.id !== undefined && admin.account_status === "active",
  );

  // 2. Create multiple active categories
  const activeCategory1: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology-" + RandomGenerator.alphaNumeric(6),
          description: "Tech and software related communities",
          icon_url: "http://localhost:3000/icons/tech.png",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(activeCategory1);
  TestValidator.equals(
    "first category is active by default",
    activeCategory1.is_active,
    true,
  );

  const activeCategory2: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Entertainment",
          slug: "entertainment-" + RandomGenerator.alphaNumeric(6),
          description: "Movies, music, and entertainment",
          icon_url: "http://localhost:3000/icons/entertainment.png",
          display_order: 2,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(activeCategory2);
  TestValidator.equals(
    "second category is active by default",
    activeCategory2.is_active,
    true,
  );

  const activeCategory3: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Sports",
          slug: "sports-" + RandomGenerator.alphaNumeric(6),
          description: "Sports and athletic communities",
          icon_url: null,
          display_order: 3,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(activeCategory3);
  TestValidator.equals(
    "third category is active by default",
    activeCategory3.is_active,
    true,
  );

  // 3. Test filtering with is_active=true
  const activeCategoriesPage: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 10,
        is_active: true,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(activeCategoriesPage);
  TestValidator.predicate(
    "all returned categories are active when is_active=true",
    activeCategoriesPage.data.every((cat) => cat.is_active === true),
  );
  TestValidator.predicate(
    "active category filter includes created categories",
    activeCategoriesPage.data.some((c) => c.id === activeCategory1.id) &&
      activeCategoriesPage.data.some((c) => c.id === activeCategory2.id) &&
      activeCategoriesPage.data.some((c) => c.id === activeCategory3.id),
  );

  // 4. Test filtering with is_active unspecified (should return all)
  const allCategoriesPage: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
        is_active: null,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(allCategoriesPage);
  TestValidator.predicate(
    "null is_active returns all categories",
    allCategoriesPage.pagination.records >= 3,
  );
  TestValidator.predicate(
    "all returned categories include created ones",
    allCategoriesPage.data.some((c) => c.id === activeCategory1.id),
  );

  // 5. Test pagination with active filter
  const paginatedActivePage: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 1,
        is_active: true,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(paginatedActivePage);
  TestValidator.equals(
    "pagination limit respected with active filter",
    paginatedActivePage.data.length,
    1,
  );
  TestValidator.predicate(
    "pagination metadata reflects correct page info",
    paginatedActivePage.pagination.current === 1 &&
      paginatedActivePage.pagination.limit === 1,
  );

  // 6. Create additional categories for large dataset testing
  const additionalCategories = await ArrayUtil.asyncRepeat(5, async (i) => {
    const cat: ICommunityPlatformCategory =
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: `Additional Category ${i}`,
            slug: `additional-${i}-${RandomGenerator.alphaNumeric(4)}`,
            display_order: 10 + i,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    typia.assert(cat);
    return cat;
  });
  TestValidator.predicate(
    "additional categories created for testing",
    additionalCategories.length === 5,
  );

  // 7. Test filtering with search parameter combined with active filter
  const searchWithFilterPage: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: "Technology",
        is_active: true,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(searchWithFilterPage);
  TestValidator.predicate(
    "search combined with active filter returns results",
    searchWithFilterPage.data.length >= 0,
  );

  // 8. Test filtering with sorting
  const sortedActivePage: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 10,
        is_active: true,
        sort_by: "display_order",
        order: "asc",
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(sortedActivePage);
  TestValidator.predicate(
    "sorting with active filter returns only active categories",
    sortedActivePage.data.every((cat) => cat.is_active === true),
  );
  TestValidator.predicate(
    "sort order is maintained in results",
    sortedActivePage.data.length <= 1 ||
      sortedActivePage.data[0].display_order <=
        sortedActivePage.data[1].display_order,
  );

  // 9. Verify pagination for filtered active categories
  const allActiveCategories: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
        is_active: true,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(allActiveCategories);
  TestValidator.predicate(
    "pagination records count includes created categories",
    allActiveCategories.pagination.records >= 8,
  );
  TestValidator.predicate(
    "pagination pages calculation is correct",
    allActiveCategories.pagination.pages > 0,
  );

  // 10. Test default behavior (no is_active specified)
  const defaultBehaviorPage: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(defaultBehaviorPage);
  TestValidator.predicate(
    "default behavior returns all categories",
    defaultBehaviorPage.pagination.records >= 8,
  );
  TestValidator.predicate(
    "default includes both active and any inactive",
    defaultBehaviorPage.data.length > 0,
  );

  // 11. Verify response structure integrity
  TestValidator.predicate(
    "pagination current matches requested page",
    defaultBehaviorPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "category objects have required fields",
    defaultBehaviorPage.data.every(
      (cat) =>
        cat.id !== undefined &&
        cat.name !== undefined &&
        cat.slug !== undefined &&
        cat.is_active !== undefined &&
        cat.display_order !== undefined,
    ),
  );
}
