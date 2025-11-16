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
 * Verify like engagement state for a member user who has NOT liked an article.
 *
 * ## Business goal
 *
 * Ensure that the engagement endpoint PATCH
 * /discussionBoard/memberUser/articles/{articleId}/likes correctly
 * distinguishes between:
 *
 * - The global like count for an article, and
 * - The current authenticated member users own like state.
 *
 * In particular, when member user A has liked an article but member user B has
 * not, member B should see:
 *
 * - TotalLikeCount  1 (reflecting the like from A), and
 * - LikedByCurrentMember === false.
 *
 * ## High level flow
 *
 * 1. Create member user A via POST /auth/memberUser/join (auto-authenticated).
 * 2. Create member user B via another POST /auth/memberUser/join.
 * 3. Create an admin user via POST /auth/adminUser/join.
 * 4. As admin user, create an article category via POST
 *    /discussionBoard/adminUser/articleCategories using
 *    IDiscussionBoardArticleCategory.ICreate.
 * 5. As member user A, create an article via POST
 *    /discussionBoard/memberUser/articles using IDiscussionBoardArticle.ICreate
 *    with the created category id.
 * 6. Still as member user A, like the article using POST
 *    /discussionBoard/memberUser/articles/{articleId}/likes with
 *    IDiscussionBoardArticleLike.ICreate (empty payload).
 * 7. Switch authentication to member user B.
 * 8. As member user B, call PATCH
 *    /discussionBoard/memberUser/articles/{articleId}/likes to retrieve
 *    engagement state.
 * 9. Assert that:
 *
 *    - Engagement.article.id equals the created article id,
 *    - Engagement.totalLikeCount >= 1,
 *    - Engagement.likedByCurrentMember === false.
 */
export async function test_api_article_like_engagement_state_for_not_liked_article(
  connection: api.IConnection,
) {
  // 1. Register member user A (auto-authenticate)
  const memberAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: null,
    location: null,
    ip: null,
    href: "https://frontend.example.com/signup",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberA: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // 2. Register member user B (auto-authenticate, overwriting Authorization)
  const memberBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: null,
    location: null,
    ip: null,
    href: "https://frontend.example.com/signup",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberB: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // 3. Register admin user (auto-authenticate as admin)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    bio: null,
    ip: null,
    href: "https://frontend.example.com/admin/signup",
    referrer: "https://frontend.example.com/admin/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const admin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 4. Create an article category as admin
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 5. Switch authentication back to member user A (login)
  const memberALoginBody = {
    email: memberA.email,
    password: memberAJoinBody.password,
    ip: null,
    href: "https://frontend.example.com/login",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberALoggedIn: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALoggedIn);

  // 6. Create an article under the created category as member user A
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 7. Like the article once as member user A
  const likeA: IDiscussionBoardArticleLike =
    await api.functional.discussionBoard.memberUser.articles.likes.create(
      connection,
      {
        articleId: article.id,
        body: {} satisfies IDiscussionBoardArticleLike.ICreate,
      },
    );
  typia.assert(likeA);

  // Basic sanity checks for A's like response
  TestValidator.equals(
    "article id in likeA response matches created article",
    likeA.article.id,
    article.id,
  );
  TestValidator.predicate(
    "total like count for article after member A like is at least 1",
    likeA.totalLikeCount >=
      (0 as number & tags.Type<"int32"> & tags.Minimum<0>),
  );
  TestValidator.equals(
    "current member A is marked as having liked the article",
    likeA.likedByCurrentMember,
    true,
  );

  // 8. Switch authentication to member user B (login)
  const memberBLoginBody = {
    email: memberB.email,
    password: memberBJoinBody.password,
    ip: null,
    href: "https://frontend.example.com/login",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberBLoggedIn: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert(memberBLoggedIn);

  // 9. Retrieve engagement state as member user B using PATCH endpoint
  const engagementB: IDiscussionBoardArticleLike =
    await api.functional.discussionBoard.memberUser.articles.likes.patchByArticleid(
      connection,
      {
        articleId: article.id,
      },
    );
  typia.assert(engagementB);

  // 10. Core assertions for "not liked by current member B" scenario
  TestValidator.equals(
    "article id in engagement response for member B matches created article",
    engagementB.article.id,
    article.id,
  );

  TestValidator.predicate(
    "total like count for member B engagement is at least 1 (due to member A's like)",
    engagementB.totalLikeCount >=
      (1 as number & tags.Type<"int32"> & tags.Minimum<0>),
  );

  TestValidator.equals(
    "current member B has not liked the article (likedByCurrentMember is false)",
    engagementB.likedByCurrentMember,
    false,
  );
}
