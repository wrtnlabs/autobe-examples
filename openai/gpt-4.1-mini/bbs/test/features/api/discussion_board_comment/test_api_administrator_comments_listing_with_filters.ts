import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_administrator_comments_listing_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardAdministrator.IJoin;
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    href: "https://localhost/login",
    referrer: "https://localhost/",
  } satisfies IDiscussionBoardAdministrator.ILogin;
  const adminLoggedIn = await authorize_administrator_login(adminConnection, {
    body: adminLoginBody,
  });
  typia.assert(adminLoggedIn);
  // 2. Registered user join and login
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardRegisteredUser.IJoin;
  const userAuth = await authorize_registered_user_join(userConnection, {
    body: userJoinBody,
  });
  typia.assert(userAuth);
  const userLoginBody = {
    email: userJoinBody.email,
    password: userJoinBody.password,
  } satisfies IDiscussionBoardRegisteredUser.ILogin;
  const userLoggedIn = await authorize_registered_user_login(userConnection, {
    body: userLoginBody,
  });
  typia.assert(userLoggedIn);
  // 3. Registered user creates an article
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {},
    );
  typia.assert(article);
  // 4. Registered user creates multiple comments on the article
  // We create 3 comments with different content, two by the same user
  const commentContents = [
    "This is an important comment about the article.",
    "Another insightful comment.",
    "Additional feedback from user.",
  ];
  // We simulate comments as summaries with necessary props for testing filter
  const allComments: IDiscussionBoardComment.ISummary[] = [];
  for (const content of commentContents) {
    // Simulate comment object
    const comment: IDiscussionBoardComment.ISummary = {
      id: typia.random<string & tags.Format<"uuid">>(),
      content: content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      author: userAuth as IDiscussionBoardRegisteredUser.ISummary,
    };
    allComments.push(comment);
  }
  // 5. Admin lists comments filtered by article ID and author ID
  // The API requires administrator authorization
  // Filter for comments matching article and author
  const adminCommentsByArticleAuthor =
    await api.functional.discussionBoard.administrator.comments.index(
      adminConnection,
      {
        body: {
          discussionBoardArticleId: article.id,
          discussionBoardRegisteredUserId: userAuth.id,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(adminCommentsByArticleAuthor);
  // Validate all comments have the article id and author id
  TestValidator.predicate(
    "all comments match author id",
    adminCommentsByArticleAuthor.data.every((c) => c.author.id === userAuth.id),
  );
  // Since API returns summaries, content should include the test contents
  const foundContents = adminCommentsByArticleAuthor.data.map((c) => c.content);
  for (const content of commentContents) {
    TestValidator.predicate(
      `comment content included: ${content}`,
      foundContents.includes(content),
    );
  }
  // 6. Admin lists comments filtered by content keyword
  // Use a keyword that appears in one or more comments
  const keyword = "important";
  const adminCommentsByKeyword =
    await api.functional.discussionBoard.administrator.comments.index(
      adminConnection,
      {
        body: {
          contentKeywords: keyword,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(adminCommentsByKeyword);
  TestValidator.predicate(
    "comments contain content keyword",
    adminCommentsByKeyword.data.every((c) => c.content.includes(keyword)),
  );
  // 7. Negative test: unauthorized access must fail
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized comment list access", async () => {
    await api.functional.discussionBoard.administrator.comments.index(
      unauthorizedConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  });
}
