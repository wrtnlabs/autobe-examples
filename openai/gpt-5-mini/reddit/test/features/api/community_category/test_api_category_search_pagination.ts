import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityCategory";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsCommunityCategory";

export async function test_api_category_search_pagination(
  connection: api.IConnection,
) {
  // Create a unique suffix for test isolation
  const ts = Date.now();
  const adminEmail = `sysadmin-${ts}@example.test`;
  const adminPassword = "Passw0rd1"; // satisfies password policy (min8, upper, lower, digit)

  // 1) Create system admin and obtain authorization (SDK will attach token to connection)
  const admin: ICommunityBbsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: `sysadmin-${ts}`,
      } satisfies ICommunityBbsSystemAdmin.ICreate,
    });
  typia.assert(admin);

  // Use unique codes/titles for categories
  const parentCode = `test-parent-${ts}`;
  const parentTitle = `Test Parent ${ts}`;

  const childCode = `test-child-${ts}`;
  const childTitle = `Test Child ${ts} UniqueSnippet`;

  const otherCode = `test-other-${ts}`;
  const otherTitle = `Other Category ${ts}`;

  // 2) As system admin, create multiple categories
  const parentCategory: ICommunityBbsCommunityCategory =
    await api.functional.communityBbs.systemAdmin.categories.create(
      connection,
      {
        body: {
          code: parentCode,
          title: parentTitle,
          description: "Parent category for pagination tests",
          display_order: 0,
        } satisfies ICommunityBbsCommunityCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  TestValidator.equals(
    "created parent category code matches",
    parentCategory.code,
    parentCode,
  );
  TestValidator.equals(
    "created parent category title matches",
    parentCategory.title,
    parentTitle,
  );

  const childCategory: ICommunityBbsCommunityCategory =
    await api.functional.communityBbs.systemAdmin.categories.create(
      connection,
      {
        body: {
          code: childCode,
          title: childTitle,
          description: "Child category under parent",
          parent_code: parentCode,
          display_order: 1,
        } satisfies ICommunityBbsCommunityCategory.ICreate,
      },
    );
  typia.assert(childCategory);
  TestValidator.equals(
    "created child category code matches",
    childCategory.code,
    childCode,
  );

  const otherCategory: ICommunityBbsCommunityCategory =
    await api.functional.communityBbs.systemAdmin.categories.create(
      connection,
      {
        body: {
          code: otherCode,
          title: otherTitle,
          description: "Another category to ensure pagination",
          display_order: 2,
        } satisfies ICommunityBbsCommunityCategory.ICreate,
      },
    );
  typia.assert(otherCategory);

  // 3) Public caller: create unauthenticated connection
  const publicConn: api.IConnection = { ...connection, headers: {} };

  // 4) Call PATCH /communityBbs/categories with search q for the unique snippet
  const searchReq = {
    q: "UniqueSnippet",
    limit: 1,
  } satisfies ICommunityBbsCommunityCategory.IRequest;

  const pageResult: IPageICommunityBbsCommunityCategory.ISummary =
    await api.functional.communityBbs.categories.index(publicConn, {
      body: searchReq,
    });
  typia.assert(pageResult);

  // Pagination assertions
  TestValidator.equals(
    "pagination limit is respected",
    pageResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination pages equals ceil(records/limit)",
    pageResult.pagination.pages ===
      Math.ceil(pageResult.pagination.records / pageResult.pagination.limit),
  );

  // The search q should return the child category (title contains UniqueSnippet)
  TestValidator.predicate(
    "search results include created category by title snippet",
    pageResult.data.some(
      (d) => d.code === childCode || d.title.indexOf("UniqueSnippet") !== -1,
    ),
  );

  // 5) Verify parent-scoped filtering returns only children of the parent
  const parentFilterReq = {
    parent_code: parentCode,
    limit: 10,
  } satisfies ICommunityBbsCommunityCategory.IRequest;

  const parentScoped: IPageICommunityBbsCommunityCategory.ISummary =
    await api.functional.communityBbs.categories.index(publicConn, {
      body: parentFilterReq,
    });
  typia.assert(parentScoped);

  TestValidator.predicate(
    "parent-scoped results all reference the requested parent",
    parentScoped.data.every(
      (d) =>
        d.parent !== null &&
        d.parent !== undefined &&
        d.parent.code === parentCode,
    ),
  );
}
