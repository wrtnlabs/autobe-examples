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
 * Validate like engagement state for a liked article.
 *
 * Business workflow:
 *
 * 1. Register a member user (join) and obtain an authenticated member session.
 * 2. Register an admin user (join) and obtain an authenticated admin session.
 * 3. As admin, create an article category that can be used when creating articles.
 * 4. Switch back to the member user context via login.
 * 5. As member, create an article under the created category.
 * 6. As member, like the article using POST
 *    /discussionBoard/memberUser/articles/{articleId}/likes.
 * 7. As the same member, call PATCH
 *    /discussionBoard/memberUser/articles/{articleId}/likes to retrieve like
 *    engagement information.
 * 8. Assert that the engagement response reports:
 *
 *    - TotalLikeCount === 1
 *    - LikedByCurrentMember === true
 *    - Article.id and article.title match the created article
 *    - Article.category summary fields align with the created category.
 */
export async function test_api_article_like_engagement_state_for_liked_article(
  connection: api.IConnection,
) {
  // 1. Member registration (join)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberJoinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const memberJoinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const memberJoinRequest = {
    email: memberEmail,
    password: "P@ssw0rd",
    displayName: RandomGenerator.name(1),
    bio: null,
    location: null,
    ip: null,
    href: memberJoinHref,
    referrer: memberJoinReferrer,
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinRequest,
    });
  typia.assert(memberAuthorized);

  // 2. Admin registration (join)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const adminJoinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const adminJoinRequest = {
    email: adminEmail,
    password: "AdminP@ssw0rd1!",
    display_name: RandomGenerator.name(1),
    bio: null,
    ip: null,
    href: adminJoinHref,
    referrer: adminJoinReferrer,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(adminAuthorized);

  // 3. Admin creates an article category
  const categoryCreateBody = {
    code: `TEST_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 4. Switch back to member context via login
  const memberLoginHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const memberLoginReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const memberLoginRequest = {
    email: memberEmail,
    password: "P@ssw0rd",
    ip: null,
    href: memberLoginHref,
    referrer: memberLoginReferrer,
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLoggedIn: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginRequest,
    });
  typia.assert(memberLoggedIn);

  // 5. Member creates an article under the created category
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 6. Member likes the article
  const likeCreateBody = {} satisfies IDiscussionBoardArticleLike.ICreate;

  const likeAfterCreate: IDiscussionBoardArticleLike =
    await api.functional.discussionBoard.memberUser.articles.likes.create(
      connection,
      {
        articleId: article.id,
        body: likeCreateBody,
      },
    );
  typia.assert(likeAfterCreate);

  // 7. Retrieve like engagement via PATCH endpoint
  const engagement: IDiscussionBoardArticleLike =
    await api.functional.discussionBoard.memberUser.articles.likes.patchByArticleid(
      connection,
      {
        articleId: article.id,
      },
    );
  typia.assert(engagement);

  // 8. Business assertions
  TestValidator.equals(
    "like count after single like should be 1",
    engagement.totalLikeCount,
    1,
  );

  TestValidator.predicate(
    "likedByCurrentMember must be true after like",
    engagement.likedByCurrentMember === true,
  );

  TestValidator.equals(
    "engagement.article.id matches created article id",
    engagement.article.id,
    article.id,
  );

  TestValidator.equals(
    "engagement.article.title matches created article title",
    engagement.article.title,
    article.title,
  );

  TestValidator.equals(
    "engagement.article.category.id matches created category id",
    engagement.article.category.id,
    category.id,
  );

  TestValidator.equals(
    "engagement.article.category.code matches created category code",
    engagement.article.category.code,
    category.code,
  );

  TestValidator.equals(
    "engagement.article.category.name matches created category name",
    engagement.article.category.name,
    category.name,
  );
}
