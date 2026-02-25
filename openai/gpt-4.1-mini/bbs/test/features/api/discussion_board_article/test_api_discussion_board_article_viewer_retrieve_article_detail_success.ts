import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_discussion_board_article_viewer_retrieve_article_detail_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Registered user creates and retrieves own article with full details
  const baseConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_registered_user_join(baseConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  typia.assert(userJoin);
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: userJoin.token.access },
  };
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          content: RandomGenerator.content({ paragraphs: 3 }),
          sectionId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(article);
  // Retrieve article with public (unauthenticated) connection
  const publicConnection: api.IConnection = { host: connection.host };
  const retrievedArticle =
    await api.functional.discussionBoard.registeredUser.articles.at(
      publicConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(retrievedArticle);
  // Validate article fields
  TestValidator.equals("article id matches", retrievedArticle.id, article.id);
  TestValidator.equals(
    "article title matches",
    retrievedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "article content matches",
    retrievedArticle.content,
    article.content,
  );
  // Instead of asserting section.id which does not exist, just check section summary content
  TestValidator.predicate(
    "article section is summary",
    retrievedArticle.section !== null &&
      typeof retrievedArticle.section === "object",
  );
  // Validate author information matches userJoin summary
  typia.assert(retrievedArticle.author);
  TestValidator.predicate(
    "author id is string",
    typeof retrievedArticle.author.id === "string",
  );
  TestValidator.equals(
    "author email matches",
    retrievedArticle.author.email,
    userJoin.email,
  );
  TestValidator.equals(
    "author displayName matches",
    retrievedArticle.author.displayName,
    userJoin.displayName,
  );
  // Validate timestamps with typia assertion
  typia.assert<string & tags.Format<"date-time">>(retrievedArticle.createdAt);
  typia.assert<string & tags.Format<"date-time">>(retrievedArticle.updatedAt);
  // Validate optional deletedAt can be null or string & date-time
  if (
    retrievedArticle.deletedAt !== null &&
    retrievedArticle.deletedAt !== undefined
  ) {
    typia.assert<string & tags.Format<"date-time">>(retrievedArticle.deletedAt);
  }
  // Validate files array and its items
  TestValidator.predicate(
    "files is array",
    Array.isArray(retrievedArticle.files),
  );
  for (const file of retrievedArticle.files) {
    typia.assert(file);
    TestValidator.predicate(
      "file belongs to article",
      file.articleId === retrievedArticle.id,
    );
  }
  // Validate images array and its items
  TestValidator.predicate(
    "images is array",
    Array.isArray(retrievedArticle.images),
  );
  for (const image of retrievedArticle.images) {
    typia.assert(image);
    TestValidator.predicate(
      "image belongs to article",
      image.discussionBoardArticleId === retrievedArticle.id,
    );
  }
  // Validate tags array and its items
  TestValidator.predicate(
    "tags is array",
    Array.isArray(retrievedArticle.tags),
  );
  for (const tag of retrievedArticle.tags) {
    typia.assert(tag);
  }
  // Scenario 2: Retrieving a non-existent article should return 404 error
  const randomArticleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "retrieve non-existent article returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.at(
        publicConnection,
        {
          articleId: randomArticleId,
        },
      );
    },
  );
  // Scenario 3: Guest access to the article without authentication
  // Use public connection without auth headers
  const guestRetrievedArticle =
    await api.functional.discussionBoard.registeredUser.articles.at(
      publicConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(guestRetrievedArticle);
  // Validate guest can see full article details
  TestValidator.equals(
    "guest article id matches",
    guestRetrievedArticle.id,
    article.id,
  );
  TestValidator.equals(
    "guest article title matches",
    guestRetrievedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "guest article content matches",
    guestRetrievedArticle.content,
    article.content,
  );
}
