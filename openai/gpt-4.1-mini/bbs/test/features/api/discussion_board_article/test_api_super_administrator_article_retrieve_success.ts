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
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_super_administrator_article_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving a detailed article by its UUID as a super administrator with valid authorization token.
  // Verify that the full article details including title, content, attachments, images, tags, and author profile are returned correctly.
  // Confirm proper HTTP 200 status and response body structure conforming to IDiscussionBoardArticle schema.
  // This test depends on prior creation of an article by a registered user with valid data.
  // 1. Registered user join
  const userJoinConnection: api.IConnection = { host: connection.host };
  const joinedUser = await authorize_registered_user_join(userJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePass1234",
    },
  });
  typia.assert(joinedUser);
  // 2. Use user connection with authorization
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: joinedUser.token.access };
  // 3. Create article by registered user
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
  // 4. Super administrator join
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const joinedAdmin = await authorize_super_administrator_join(
    adminJoinConnection,
    {},
  );
  typia.assert(joinedAdmin);
  // 5. Use super administrator connection with authorization
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = { Authorization: joinedAdmin.token.access };
  // 6. Retrieve the article by super administrator
  const retrieved =
    await api.functional.discussionBoard.superAdministrator.articles.at(
      adminConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(retrieved);
  // 7. Validate the retrieved data
  TestValidator.equals("article id match", retrieved.id, article.id);
  TestValidator.equals("article title match", retrieved.title, article.title);
  TestValidator.equals(
    "article content match",
    retrieved.content,
    article.content,
  );
  TestValidator.equals("section match", retrieved.section, article.section);
  TestValidator.equals("author match", retrieved.author, article.author);
}
