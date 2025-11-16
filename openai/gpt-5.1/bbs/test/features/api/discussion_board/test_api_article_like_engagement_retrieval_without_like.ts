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
import type { IDiscussionBoardArticleLike } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleLike";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

/**
 * Validate like engagement retrieval for an unliked article.
 *
 * Business goal:
 *
 * - Ensure that when a member user (Member B) queries the like engagement for an
 *   article that they have never liked, the system reports totalLikeCount = 0
 *   and likedByCurrentMember = false, and that the embedded article summary
 *   refers to the correct article.
 *
 * Scenario steps:
 *
 * 1. Register Member A (author) via memberUser join.
 * 2. Register an admin user via adminUser join.
 * 3. As admin, create an article category.
 * 4. Switch back to Member A via memberUser login.
 * 5. As Member A, create an article under the created category and capture
 *    articleId.
 * 6. Register Member B via memberUser join (this authenticates as Member B).
 * 7. As Member B, call GET /discussionBoard/memberUser/articles/{articleId}/likes.
 * 8. Assert that:
 *
 *    - Response conforms to IDiscussionBoardArticleLike.
 *    - Like.article.id equals the created articleId.
 *    - Like.totalLikeCount is 0.
 *    - Like.likedByCurrentMember is false.
 */
export async function test_api_article_like_engagement_retrieval_without_like(
  connection: api.IConnection,
) {
  // 1. Register Member A (author)
  const memberAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberAPassword: string = RandomGenerator.alphaNumeric(12);

  const memberAJoinBody = {
    email: memberAEmail,
    password: memberAPassword,
    displayName: RandomGenerator.name(1),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberA: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // 2. Register an admin user
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(1),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As admin, create an article category
  const categoryCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 4. Switch back to Member A using memberUser login
  const memberALoginBody = {
    email: memberAEmail,
    password: memberAPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberALogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALogin);

  // 5. As Member A, create an article under the created category
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 6. Register Member B (viewer)
  const memberBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberBPassword: string = RandomGenerator.alphaNumeric(12);

  const memberBJoinBody = {
    email: memberBEmail,
    password: memberBPassword,
    displayName: RandomGenerator.name(1),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberB: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // 7. As Member B, retrieve like engagement for the article
  const like: IDiscussionBoardArticleLike =
    await api.functional.discussionBoard.memberUser.articles.likes.getByArticleid(
      connection,
      { articleId: article.id },
    );
  typia.assert(like);

  // 8. Assertions on like engagement
  TestValidator.equals(
    "article id in like engagement matches created article",
    like.article.id,
    article.id,
  );

  TestValidator.equals(
    "totalLikeCount should be zero when no likes exist",
    like.totalLikeCount,
    0,
  );

  TestValidator.equals(
    "likedByCurrentMember should be false for non-liking member",
    like.likedByCurrentMember,
    false,
  );
}
