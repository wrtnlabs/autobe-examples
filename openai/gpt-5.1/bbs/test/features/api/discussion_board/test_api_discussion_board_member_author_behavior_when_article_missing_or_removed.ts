import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardArticleOfMemberusersMemberAuthor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleOfMemberusersMemberAuthor";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

/**
 * Validate member author resolution behavior for existing vs. missing articles.
 *
 * Business context:
 *
 * - Articles can be authored by member users via the memberUser actor.
 * - The `GET /discussionBoard/articles/{articleId}/memberAuthor` endpoint returns
 *   a public projection of the member user who authored the article when the
 *   article exists and is linked to a member author via
 *   `discussion_board_article_of_memberusers`.
 * - When the article does not exist at all, the endpoint is expected to fail
 *   without returning any author DTO, providing clear consumer-facing semantics
 *   that the article context is invalid.
 *
 * This test sets up a realistic board environment with both admin and member
 * actors, creates required category master data, then verifies both the
 * successful and error-path behaviors of the member author endpoint.
 *
 * Steps:
 *
 * 1. Register an adminUser and rely on automatic authentication to obtain an admin
 *    session.
 * 2. As adminUser, create a discussion board article category that can be used for
 *    member-authored articles.
 * 3. Register a memberUser account and rely on automatic authentication to obtain
 *    a member session.
 * 4. As memberUser, create a control article assigned to the created category
 *    using POST /discussionBoard/memberUser/articles.
 * 5. Call GET /discussionBoard/articles/{articleId}/memberAuthor with the control
 *    article id and verify that:
 *
 *    - The call succeeds and returns an
 *         IDiscussionBoardArticleOfMemberusersMemberAuthor DTO.
 *    - The author.id matches the member user's id.
 *    - The author.displayName matches the member user's display_name field.
 * 6. Generate a random UUID that does not correspond to any existing article
 *    (overwhelmingly likely when using typia.random<uuid>()), and call the same
 *    memberAuthor endpoint with that non-existent articleId, wrapped in
 *    TestValidator.error to assert that an error is thrown and no author DTO is
 *    returned.
 *
 * This test does not verify detailed HTTP status codes or internal moderation
 * state transitions; instead, it focuses on externally observable behavior: a
 * valid member author is resolved for a real article, and no author information
 * is exposed when the article context is invalid or missing.
 */
export async function test_api_discussion_board_member_author_behavior_when_article_missing_or_removed(
  connection: api.IConnection,
) {
  // 1. Register an adminUser (automatic admin authentication via SDK)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: null,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. As adminUser, create an article category
  const categoryCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 3. Register a memberUser (automatic member authentication via SDK)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword = RandomGenerator.alphaNumeric(16);

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(1),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorizedFromJoin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  // Optionally, explicitly login again as memberUser to confirm login flow
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberAuthorizedFromLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  // Ensure the same member account is represented in both responses
  TestValidator.equals(
    "member id from join and login must match",
    memberAuthorizedFromLogin.id,
    memberAuthorizedFromJoin.id,
  );

  // 4. As memberUser, create a control article
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleCreateBody },
    );
  typia.assert(article);

  // 5. Successful member author resolution for existing article
  const memberAuthor: IDiscussionBoardArticleOfMemberusersMemberAuthor =
    await api.functional.discussionBoard.articles.memberAuthor.at(connection, {
      articleId: article.id,
    });
  typia.assert(memberAuthor);

  // Validate that member author info matches the member user's identity
  TestValidator.equals(
    "member author id must equal member user id",
    memberAuthor.id,
    memberAuthorizedFromLogin.id,
  );
  TestValidator.equals(
    "member author displayName must equal member user's display_name",
    memberAuthor.displayName,
    memberAuthorizedFromLogin.display_name,
  );

  // 6. Error behavior when articleId does not exist
  let missingArticleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Extremely unlikely, but avoid accidentally reusing the real article id
  if (missingArticleId === article.id) {
    missingArticleId = typia.random<string & tags.Format<"uuid">>();
  }

  await TestValidator.error(
    "member author lookup must fail for non-existent article id",
    async () => {
      await api.functional.discussionBoard.articles.memberAuthor.at(
        connection,
        {
          articleId: missingArticleId,
        },
      );
    },
  );
}
