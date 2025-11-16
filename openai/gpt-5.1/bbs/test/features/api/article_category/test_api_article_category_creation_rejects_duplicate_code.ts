import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

/**
 * Validate that creating a discussion-board article category enforces
 * uniqueness of the `code` field and rejects duplicates for active categories.
 *
 * Business context:
 *
 * - The `discussion_board_article_categories.code` column is a stable
 *   machine-friendly business key (e.g., "ECONOMY", "POLITICS").
 * - It must be unique among non-deleted categories so that other systems can
 *   reliably reference categories by code.
 * - Administrative users (adminUser actor) can register new categories through
 *   the admin-only creation API.
 *
 * This test covers the following workflow:
 *
 * 1. Register a new adminUser account via POST /auth/adminUser/join, which both
 *    creates the admin record and establishes an authenticated session (SDK
 *    automatically wires Authorization header using the token).
 * 2. Using the authenticated admin session, call POST
 *    /discussionBoard/adminUser/articleCategories with an
 *    IDiscussionBoardArticleCategory.ICreate payload using a specific `code`
 *    (e.g., "POLITICS_DUPLICATE"), and assert that the category is successfully
 *    created and returned with the same code.
 * 3. With the same admin session, attempt to create a second category using the
 *    _same_ `code` value but different name/description/order. This should
 *    violate the unique business constraint on `code`.
 * 4. Assert that the second creation attempt fails by using TestValidator.error
 *    with an async closure that calls the create API with the duplicate code
 *    payload, ensuring that some HttpError is thrown (without asserting a
 *    particular HTTP status or error body structure).
 *
 * Notes:
 *
 * - We do not perform a follow-up GET by code because no such read API is
 *   provided in the SDK materials; uniqueness is validated solely via the
 *   rejection of the duplicate creation request.
 */
export async function test_api_article_category_creation_rejects_duplicate_code(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and obtain an authenticated session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "127.0.0.1",
    href: "https://admin.discussion-board.example.com/register",
    referrer: "https://discussion-board.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create the first article category with a specific business `code`
  const categoryCode = "POLITICS_DUPLICATE";

  const firstCategoryBody = {
    code: categoryCode,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const firstCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: firstCategoryBody,
      },
    );
  typia.assert(firstCategory);

  TestValidator.equals(
    "created category should have the requested code",
    firstCategory.code,
    categoryCode,
  );

  // 3. Attempt to create a second category with the same `code`
  const secondCategoryBody = {
    code: categoryCode, // duplicate code
    name: RandomGenerator.name(3),
    // demonstrate that other fields can differ; uniqueness is on code only
    description: RandomGenerator.paragraph({ sentences: 2 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  await TestValidator.error(
    "duplicate category code should be rejected by create API",
    async () => {
      await api.functional.discussionBoard.adminUser.articleCategories.create(
        connection,
        {
          body: secondCategoryBody,
        },
      );
    },
  );
}
