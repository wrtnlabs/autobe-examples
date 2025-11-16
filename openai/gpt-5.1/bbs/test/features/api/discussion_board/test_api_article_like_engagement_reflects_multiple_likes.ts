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

export async function test_api_article_like_engagement_reflects_multiple_likes(
  connection: api.IConnection,
) {
  // 1. Register Member A (join) and obtain authenticated session A
  const memberAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: null,
    location: null,
    ip: null,
    href: "https://frontend.example.com/signup/member-a",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberA: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // 2. Register Member B (join) and obtain authenticated session B
  const memberBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: null,
    location: null,
    ip: null,
    href: "https://frontend.example.com/signup/member-b",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberB: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // 3. Register an admin user and obtain admin session
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
    name: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 5. Switch to Member A explicitly (login) to be clear about actor context
  const memberALoginBody = {
    email: memberA.email,
    password: memberAJoinBody.password,
    ip: null,
    href: "https://frontend.example.com/login/member-a",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberALogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALogin);

  // 6. Create a new article under the created category as Member A
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
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

  const articleId = article.id;

  // 7. Like the article as Member A
  const likeByMemberA: IDiscussionBoardArticleLike =
    await api.functional.discussionBoard.memberUser.articles.likes.create(
      connection,
      {
        articleId,
        body: {} satisfies IDiscussionBoardArticleLike.ICreate,
      },
    );
  typia.assert(likeByMemberA);

  TestValidator.equals(
    "article id in like response for member A must match created article id",
    likeByMemberA.article.id,
    articleId,
  );

  // 8. Switch to Member B using login
  const memberBLoginBody = {
    email: memberB.email,
    password: memberBJoinBody.password,
    ip: null,
    href: "https://frontend.example.com/login/member-b",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberBLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert(memberBLogin);

  // 9. Like the same article as Member B
  const likeByMemberB: IDiscussionBoardArticleLike =
    await api.functional.discussionBoard.memberUser.articles.likes.create(
      connection,
      {
        articleId,
        body: {} satisfies IDiscussionBoardArticleLike.ICreate,
      },
    );
  typia.assert(likeByMemberB);

  TestValidator.equals(
    "article id in like response for member B must match created article id",
    likeByMemberB.article.id,
    articleId,
  );

  // 10. GET like engagement as Member B (current authenticated member)
  const engagementForMemberB: IDiscussionBoardArticleLike =
    await api.functional.discussionBoard.memberUser.articles.likes.getByArticleid(
      connection,
      {
        articleId,
      },
    );
  typia.assert(engagementForMemberB);

  TestValidator.equals(
    "engagement.article.id for member B must match created article id",
    engagementForMemberB.article.id,
    articleId,
  );

  TestValidator.equals(
    "totalLikeCount should be 2 after likes from member A and B (viewed as member B)",
    engagementForMemberB.totalLikeCount,
    2,
  );

  TestValidator.equals(
    "likedByCurrentMember must be true when viewing as member B",
    engagementForMemberB.likedByCurrentMember,
    true,
  );

  // 11. Switch back to Member A and GET like engagement again
  const memberAReLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        email: memberA.email,
        password: memberAJoinBody.password,
        ip: null,
        href: "https://frontend.example.com/login/member-a",
        referrer: "https://frontend.example.com/landing",
      } satisfies IDiscussionBoardMemberUserLogin.IRequest,
    });
  typia.assert(memberAReLogin);

  const engagementForMemberA: IDiscussionBoardArticleLike =
    await api.functional.discussionBoard.memberUser.articles.likes.getByArticleid(
      connection,
      {
        articleId,
      },
    );
  typia.assert(engagementForMemberA);

  TestValidator.equals(
    "engagement.article.id for member A must match created article id",
    engagementForMemberA.article.id,
    articleId,
  );

  TestValidator.equals(
    "totalLikeCount should be 2 after likes from member A and B (viewed as member A)",
    engagementForMemberA.totalLikeCount,
    2,
  );

  TestValidator.equals(
    "likedByCurrentMember must be true when viewing as member A",
    engagementForMemberA.likedByCurrentMember,
    true,
  );
}
