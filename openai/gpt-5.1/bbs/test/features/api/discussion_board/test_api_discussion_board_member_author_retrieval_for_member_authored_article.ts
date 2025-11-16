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
 * Verify public member author retrieval for a member-authored article.
 *
 * Business goal
 *
 * - Articles authored by member users must expose a public, non-sensitive member
 *   profile via GET /discussionBoard/articles/{articleId}/memberAuthor.
 * - The endpoint must be publicly accessible (no authentication required).
 * - Returned DTO must match IDiscussionBoardArticleOfMemberusersMemberAuthor and
 *   must correspond to the actual member who authored the article.
 *
 * High level flow
 *
 * 1. As an admin user, create an article category.
 * 2. As a member user, join (register) and obtain an authenticated context.
 * 3. As that member user, create an article under the created category.
 * 4. From an unauthenticated connection, call the memberAuthor endpoint with that
 *    articleId.
 * 5. Assert that:
 *
 *    - Response shape matches IDiscussionBoardArticleOfMemberusersMemberAuthor.
 *    - `id` of the author equals the authenticated member user id.
 *    - `displayName` equals the member’s display_name.
 *    - Optional `bio` and `location` reflect the member’s profile (when provided at
 *         join time).
 *    - Sensitive information such as email, token or lifecycle fields are not
 *         present in the author DTO (we check this structurally, not by type
 *         errors).
 *
 * Failure / negative angle (within what is implementable)
 *
 * - We will not test type errors or status codes explicitly, but we will validate
 *   that the author id does not accidentally match an admin id.
 */
export async function test_api_discussion_board_member_author_retrieval_for_member_authored_article(
  connection: api.IConnection,
) {
  // 1. Admin user joins to obtain admin auth context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPW-" + RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: "https://admin.discussion-board.test/join",
    referrer: "https://admin.discussion-board.test/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an article category as admin
  const categoryCreateBody = {
    code: "ECONOMY-" + RandomGenerator.alphaNumeric(6),
    name: "Economy " + RandomGenerator.alphabets(5),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 3. Member user joins and authenticates
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberJoinBody = {
    email: memberEmail,
    password: "MemberPW-" + RandomGenerator.alphaNumeric(8),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul, Korea",
    ip: null,
    href: "https://discussion-board.test/join",
    referrer: "https://discussion-board.test/home",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member user creates an article in the created category
  const articleCreateBody = {
    title: "Economic Outlook " + RandomGenerator.alphabets(6),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 3,
      wordMax: 8,
    }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  TestValidator.equals(
    "article category id must match created category",
    article.category.id,
    category.id,
  );

  // 5. Build an unauthenticated connection (no Authorization header)
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 6. Call memberAuthor endpoint without authentication
  const memberAuthor: IDiscussionBoardArticleOfMemberusersMemberAuthor =
    await api.functional.discussionBoard.articles.memberAuthor.at(
      publicConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(memberAuthor);

  // 7. Validate that author corresponds to the member user who created the article
  TestValidator.equals(
    "member author id must equal joined member id",
    memberAuthor.id,
    memberAuthorized.id,
  );

  TestValidator.equals(
    "member author displayName must equal member display_name",
    memberAuthor.displayName,
    memberAuthorized.display_name,
  );

  if (memberJoinBody.bio !== null && memberJoinBody.bio !== undefined) {
    TestValidator.equals(
      "member author bio must reflect member bio when provided",
      memberAuthor.bio ?? null,
      memberJoinBody.bio,
    );
  }

  if (
    memberJoinBody.location !== null &&
    memberJoinBody.location !== undefined
  ) {
    TestValidator.equals(
      "member author location must reflect member location when provided",
      memberAuthor.location ?? null,
      memberJoinBody.location,
    );
  }

  // 8. Ensure that sensitive fields from IDiscussionBoardMemberuser.IAuthorized
  //    are not accidentally exposed on the memberAuthor DTO.
  const authorAsAny = memberAuthor as unknown as Record<string, unknown>;
  TestValidator.predicate(
    "member author DTO must not expose token field",
    authorAsAny.token === undefined,
  );
  TestValidator.predicate(
    "member author DTO must not expose email field",
    authorAsAny.email === undefined,
  );
  TestValidator.predicate(
    "member author DTO must not expose lifecycle fields like account_status",
    authorAsAny.account_status === undefined,
  );

  // 9. Sanity check that admin id is different from member author id
  TestValidator.notEquals(
    "member author id must not match admin id",
    memberAuthor.id,
    adminAuthorized.id,
  );
}
