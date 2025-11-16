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

export async function test_api_article_like_engagement_retrieval_after_like(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join) and obtain authorized session
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    ip: RandomGenerator.alphaNumeric(12),
    href: "https://frontend.example.com/signup",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register an admin user (join) to create categories
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: RandomGenerator.alphaNumeric(16),
    href: "https://frontend.example.com/admin/signup",
    referrer: "https://frontend.example.com/admin/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As admin, create an article category
  const categoryCreateBody = {
    code: `CAT-${RandomGenerator.alphaNumeric(8)}`,
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

  // 4. Switch back to the member user by logging in with the same credentials
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: RandomGenerator.alphaNumeric(12),
    href: "https://frontend.example.com/login",
    referrer: "https://frontend.example.com/home",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLoggedIn: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  // 5. As memberUser, create an article under the created category
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

  TestValidator.equals(
    "created article category id should match referenced categoryId",
    article.category.id,
    category.id,
  );

  // 6. As the same member, like the article
  const likeCreateBody = {} satisfies IDiscussionBoardArticleLike.ICreate;

  const likeFromPost: IDiscussionBoardArticleLike =
    await api.functional.discussionBoard.memberUser.articles.likes.create(
      connection,
      {
        articleId: article.id,
        body: likeCreateBody,
      },
    );
  typia.assert(likeFromPost);

  // Validate POST like engagement response
  TestValidator.equals(
    "POST-like: article id in engagement should match created article",
    likeFromPost.article.id,
    article.id,
  );

  TestValidator.equals(
    "POST-like: totalLikeCount should be 1 after first like",
    likeFromPost.totalLikeCount,
    1,
  );

  TestValidator.equals(
    "POST-like: likedByCurrentMember should be true after liking",
    likeFromPost.likedByCurrentMember,
    true,
  );

  TestValidator.equals(
    "POST-like: category id in article summary should match original category id",
    likeFromPost.article.category.id,
    category.id,
  );
  TestValidator.equals(
    "POST-like: category code in article summary should match original category code",
    likeFromPost.article.category.code,
    category.code,
  );
  TestValidator.equals(
    "POST-like: category name in article summary should match original category name",
    likeFromPost.article.category.name,
    category.name,
  );

  // 7. Retrieve like engagement via GET endpoint
  const likeFromGet: IDiscussionBoardArticleLike =
    await api.functional.discussionBoard.memberUser.articles.likes.getByArticleid(
      connection,
      {
        articleId: article.id,
      },
    );
  typia.assert(likeFromGet);

  // Validate GET engagement response
  TestValidator.equals(
    "GET-like: article id in engagement should match created article",
    likeFromGet.article.id,
    article.id,
  );

  TestValidator.equals(
    "GET-like: totalLikeCount should be 1 after first like",
    likeFromGet.totalLikeCount,
    1,
  );

  TestValidator.equals(
    "GET-like: likedByCurrentMember should be true for member who liked",
    likeFromGet.likedByCurrentMember,
    true,
  );

  TestValidator.equals(
    "GET-like: category id in article summary should match original category id",
    likeFromGet.article.category.id,
    category.id,
  );
  TestValidator.equals(
    "GET-like: category code in article summary should match original category code",
    likeFromGet.article.category.code,
    category.code,
  );
  TestValidator.equals(
    "GET-like: category name in article summary should match original category name",
    likeFromGet.article.category.name,
    category.name,
  );

  // Cross-validate POST and GET results for consistency
  TestValidator.equals(
    "POST and GET like engagement should have same article id",
    likeFromPost.article.id,
    likeFromGet.article.id,
  );

  TestValidator.equals(
    "POST and GET like engagement should have same totalLikeCount",
    likeFromPost.totalLikeCount,
    likeFromGet.totalLikeCount,
  );

  TestValidator.equals(
    "POST and GET like engagement should have same likedByCurrentMember flag",
    likeFromPost.likedByCurrentMember,
    likeFromGet.likedByCurrentMember,
  );
}
