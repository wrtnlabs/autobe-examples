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
 * Ensure that unliking an article as one member does not affect other members'
 * likes or the aggregated like count.
 *
 * Business flow:
 *
 * 1. Register Member A and Member B as memberUser actors.
 * 2. Register an adminUser and create an article category.
 * 3. As Member A, create an article under that category.
 * 4. As Member A, like the article.
 * 5. As Member B, like the same article.
 * 6. As Member A, unlike the article (DELETE /likes).
 * 7. As Member B, fetch like engagement via POST /likes again (idempotent like
 *    endpoint returning IDiscussionBoardArticleLike) and verify that:
 *
 *    - Member B still has likedByCurrentMember = true.
 *    - Total like count reflects only Member B's like (1).
 */
export async function test_api_article_unlike_not_affecting_other_members_likes(
  connection: api.IConnection,
) {
  // 1. Register Member A
  const memberAJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(1),
    bio: null,
    location: null,
    ip: null,
    href: "https://example.com/join/memberA",
    referrer: "https://example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberA: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinRequest,
    });
  typia.assert(memberA);

  // 2. Register Member B
  const memberBJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(1),
    bio: null,
    location: null,
    ip: null,
    href: "https://example.com/join/memberB",
    referrer: "https://example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberB: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinRequest,
    });
  typia.assert(memberB);

  // 3. Register an admin user
  const adminJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(1),
    bio: null,
    ip: null,
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const admin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(admin);

  // 4. Create an article category as admin
  const categoryCreateRequest = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateRequest,
      },
    );
  typia.assert(category);

  // 5. Switch to Member A (login) and create an article
  const memberALoginRequest = {
    email: memberA.email,
    password: memberAJoinRequest.password,
    ip: null,
    href: "https://example.com/login/memberA",
    referrer: "https://example.com/login",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberALogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginRequest,
    });
  typia.assert(memberALogin);

  const articleCreateRequest = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateRequest,
      },
    );
  typia.assert(article);

  // 6. Member A likes the article
  const likeByMemberA: IDiscussionBoardArticleLike =
    await api.functional.discussionBoard.memberUser.articles.likes.create(
      connection,
      {
        articleId: article.id,
        body: {} satisfies IDiscussionBoardArticleLike.ICreate,
      },
    );
  typia.assert(likeByMemberA);

  TestValidator.equals(
    "article id in likeByMemberA matches created article",
    likeByMemberA.article.id,
    article.id,
  );
  TestValidator.equals(
    "totalLikeCount should be 1 after Member A's like",
    likeByMemberA.totalLikeCount,
    1,
  );
  TestValidator.equals(
    "likedByCurrentMember should be true for Member A",
    likeByMemberA.likedByCurrentMember,
    true,
  );

  // 7. Switch to Member B and like the same article
  const memberBLoginRequest = {
    email: memberB.email,
    password: memberBJoinRequest.password,
    ip: null,
    href: "https://example.com/login/memberB",
    referrer: "https://example.com/login",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberBLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginRequest,
    });
  typia.assert(memberBLogin);

  const likeByMemberB: IDiscussionBoardArticleLike =
    await api.functional.discussionBoard.memberUser.articles.likes.create(
      connection,
      {
        articleId: article.id,
        body: {} satisfies IDiscussionBoardArticleLike.ICreate,
      },
    );
  typia.assert(likeByMemberB);

  TestValidator.equals(
    "article id in likeByMemberB matches created article",
    likeByMemberB.article.id,
    article.id,
  );
  TestValidator.equals(
    "totalLikeCount should be 2 after Member A and Member B like",
    likeByMemberB.totalLikeCount,
    2,
  );
  TestValidator.equals(
    "likedByCurrentMember should be true for Member B",
    likeByMemberB.likedByCurrentMember,
    true,
  );

  // 8. Switch back to Member A and unlike the article
  const memberALoginAgain: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginRequest,
    });
  typia.assert(memberALoginAgain);

  await api.functional.discussionBoard.memberUser.articles.likes.erase(
    connection,
    {
      articleId: article.id,
    },
  );

  // 9. Switch to Member B and fetch like engagement again
  const memberBLoginAgain: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginRequest,
    });
  typia.assert(memberBLoginAgain);

  const likeAfterUnlikeAsMemberB: IDiscussionBoardArticleLike =
    await api.functional.discussionBoard.memberUser.articles.likes.create(
      connection,
      {
        articleId: article.id,
        body: {} satisfies IDiscussionBoardArticleLike.ICreate,
      },
    );
  typia.assert(likeAfterUnlikeAsMemberB);

  TestValidator.equals(
    "article id after unlike still matches created article",
    likeAfterUnlikeAsMemberB.article.id,
    article.id,
  );
  TestValidator.equals(
    "totalLikeCount should be 1 after Member A unlikes (only Member B remains)",
    likeAfterUnlikeAsMemberB.totalLikeCount,
    1,
  );
  TestValidator.equals(
    "likedByCurrentMember should remain true for Member B after Member A unlikes",
    likeAfterUnlikeAsMemberB.likedByCurrentMember,
    true,
  );
}
