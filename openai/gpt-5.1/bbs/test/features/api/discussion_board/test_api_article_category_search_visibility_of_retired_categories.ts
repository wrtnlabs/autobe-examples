import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleCategory";

/**
 * Verify visibility of active article categories through public search.
 *
 * Business goal
 *
 * - Ensure that categories created by an authenticated adminUser are discoverable
 *   through the public PATCH /discussionBoard/articleCategories search
 *   endpoint.
 * - Because no admin delete/retire endpoint is available in the SDK, this test
 *   focuses on positive behavior (visibility of active categories) and
 *   structures expectations for future extension to retired categories.
 *
 * Steps
 *
 * 1. Admin join: create and authenticate an adminUser using POST
 *    /auth/adminUser/join, which also configures the Authorization header
 *    inside the shared connection.
 * 2. Seed categories: as the adminUser, create multiple article categories via
 *    POST /discussionBoard/adminUser/articleCategories using
 *    IDiscussionBoardArticleCategory.ICreate.
 * 3. Public search: call PATCH /discussionBoard/articleCategories with a basic
 *    IDiscussionBoardArticleCategory.IRequest (page/limit, no filters) to
 *    retrieve a page of categories.
 * 4. Visibility checks: assert that all newly created categories are present in
 *    the public search result data.
 */
export async function test_api_article_category_search_visibility_of_retired_categories(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 4 }),
    ip: null,
    href: "https://admin-frontend.example.com/join" as string &
      tags.Format<"uri">,
    referrer: "https://admin-frontend.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seed multiple active categories as the admin user
  const categoryPayloads = [
    {
      code: `ECONOMY_${RandomGenerator.alphaNumeric(8)}`,
      name: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 4 }),
      order: 1 as number & tags.Type<"int32">,
    },
    {
      code: `POLITICS_${RandomGenerator.alphaNumeric(8)}`,
      name: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 4 }),
      order: 2 as number & tags.Type<"int32">,
    },
  ] satisfies IDiscussionBoardArticleCategory.ICreate[];

  const createdCategories: IDiscussionBoardArticleCategory[] = [];
  for (const payload of categoryPayloads) {
    const created =
      await api.functional.discussionBoard.adminUser.articleCategories.create(
        connection,
        {
          body: payload,
        },
      );
    typia.assert(created);
    createdCategories.push(created);
  }

  // 3. Call public category search endpoint with basic pagination
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: null,
    codes: undefined,
    order_by: undefined,
    order_direction: undefined,
  } satisfies IDiscussionBoardArticleCategory.IRequest;

  const page: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articleCategories.index(connection, {
      body: requestBody,
    });
  typia.assert(page);

  // Basic sanity: pagination and non-empty data (we expect at least our two)
  TestValidator.predicate(
    "public category search returns at least one category",
    page.data.length > 0,
  );

  // 4. Check visibility of newly created categories in public search results
  const codesInPage = new Set(page.data.map((c) => c.code));

  for (const created of createdCategories) {
    TestValidator.predicate(
      `created category code ${created.code} is visible in public search`,
      codesInPage.has(created.code),
    );

    const summary = page.data.find((c) => c.code === created.code);
    TestValidator.predicate(
      `created category name for code ${created.code} matches summary name`,
      !!summary && summary.name === created.name,
    );
  }
}
