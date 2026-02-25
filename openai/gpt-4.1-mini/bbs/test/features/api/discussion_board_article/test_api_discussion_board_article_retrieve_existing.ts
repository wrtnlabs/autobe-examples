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

export async function test_api_discussion_board_article_retrieve_existing(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Registered user join & login
  const userJoinConn: api.IConnection = { host: connection.host };
  const userPassword = RandomGenerator.alphaNumeric(16);
  const userJoinOutput = await authorize_registered_user_join(userJoinConn, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: userPassword,
    },
  });
  typia.assert(userJoinOutput);
  const userLoginConn: api.IConnection = { host: connection.host };
  const userLoginOutput = await authorize_registered_user_login(userLoginConn, {
    body: {
      email: userJoinOutput.email,
      password: userPassword,
    },
  });
  typia.assert(userLoginOutput);
  // Step 2: Registered user creates an article
  const userArticleConn: api.IConnection = { host: connection.host };
  userArticleConn.headers = userLoginConn.headers;
  const createdArticle =
    await generate_random_discussion_board_registered_user_articles_create(
      userArticleConn,
      {
        body: {
          title: RandomGenerator.name(),
          content: RandomGenerator.content({ paragraphs: 3 }),
          sectionId: typia.random<string & tags.Format<"uuid">>(),
          tags: ["news", "update"],
          attachments: [],
        },
      },
    );
  typia.assert(createdArticle);
  // Step 3: Administrator join & login
  const adminJoinConn: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinOutput = await authorize_administrator_join(adminJoinConn, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
    },
  });
  typia.assert(adminJoinOutput);
  const adminLoginConn: api.IConnection = { host: connection.host };
  const adminLoginOutput = await authorize_administrator_login(adminLoginConn, {
    body: {
      email: adminJoinOutput.email,
      password: adminPassword,
      href: "http://localhost/login",
      referrer: "http://localhost/referrer",
    },
  });
  typia.assert(adminLoginOutput);
  // Step 4: Set up administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = adminLoginConn.headers;
  // Step 5: Administrator retrieves the article by ID
  const article =
    await api.functional.discussionBoard.administrator.articles.at(
      adminConnection,
      {
        articleId: createdArticle.id,
      },
    );
  typia.assert(article);
  // Step 6: Validate mandatory fields
  TestValidator.equals("article ID", article.id, createdArticle.id);
  TestValidator.equals("article title", article.title, createdArticle.title);
  TestValidator.equals(
    "article content",
    article.content,
    createdArticle.content,
  );
  // Validate author summary
  typia.assert(article.author);
  TestValidator.equals("author ID", article.author.id, userJoinOutput.id);
  TestValidator.equals(
    "author email",
    article.author.email,
    userJoinOutput.email,
  );
  TestValidator.predicate(
    "author displayName exists",
    article.author.displayName.length > 0,
  );
  TestValidator.predicate(
    "author is not banned",
    article.author.isBanned === false,
  );
  TestValidator.predicate("author createdAt valid", !!article.author.createdAt);
  // Validate section summary
  typia.assert(article.section);
  // Validate attachments (files and images) - optional arrays
  TestValidator.predicate("files is array", Array.isArray(article.files));
  for (const file of article.files) {
    typia.assert(file);
    TestValidator.equals("file articleId matches", file.articleId, article.id);
    TestValidator.predicate("file fileName set", file.fileName.length > 0);
    TestValidator.predicate("file fileType set", file.fileType.length > 0);
    TestValidator.predicate("file fileSize positive", file.fileSize > 0);
    TestValidator.predicate(
      "file downloadUrl set",
      file.downloadUrl.length > 0,
    );
  }
  TestValidator.predicate("images is array", Array.isArray(article.images));
  for (const image of article.images) {
    typia.assert(image);
    TestValidator.equals(
      "image articleId matches",
      image.discussionBoardArticleId,
      article.id,
    );
    TestValidator.predicate("image imageUrl set", image.imageUrl.length > 0);
    // description is nullable
    if (image.description !== null && image.description !== undefined) {
      TestValidator.predicate(
        "image description not empty",
        image.description.length > 0,
      );
    }
    TestValidator.predicate(
      "image displayOrder non negative",
      image.displayOrder >= 0,
    );
  }
  // Validate tags
  TestValidator.predicate("tags is array", Array.isArray(article.tags));
  for (const tag of article.tags) {
    typia.assert(tag);
    TestValidator.predicate(
      "tag id format UUID",
      /^[0-9a-fA-F-]{36}$/.test(tag.id),
    );
    // Removed tag.name check because it doesn't exist in ISummary
  }
  // Validate timestamps
  TestValidator.predicate(
    "createdAt is ISO string",
    Boolean(
      article.createdAt.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z?$/),
    ),
  );
  TestValidator.predicate(
    "updatedAt is ISO string",
    Boolean(
      article.updatedAt.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z?$/),
    ),
  );
  // deletedAt nullable
  if (article.deletedAt !== null && article.deletedAt !== undefined) {
    TestValidator.predicate(
      "deletedAt is ISO string",
      Boolean(
        article.deletedAt.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z?$/),
      ),
    );
  } else {
    TestValidator.equals("deletedAt is null", article.deletedAt, null);
  }
}
