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

export async function test_api_discussion_board_article_retrieve_with_attachments_tags(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and logs in
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPass123!",
    },
  });
  typia.assert(adminJoin);
  const adminLogin = await authorize_administrator_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: "StrongPass123!",
      href: "https://example.com/login",
      referrer: "https://example.com/referrer",
      ip: null,
    },
  });
  typia.assert(adminLogin);
  // 2. Registered user joins and logs in
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(userJoin);
  const userLogin = await authorize_registered_user_login(userConnection, {
    body: {
      email: userJoin.email,
      password: "12345678",
    },
  });
  typia.assert(userLogin);
  // 3. Registered user creates article with multiple attachments, images, and tags
  const tags = ["news", "announcement", "events"];
  const articleCreateBody = {
    title: RandomGenerator.name(3),
    content: RandomGenerator.content({ paragraphs: 2 }),
    sectionId: typia.random<string & tags.Format<"uuid">>(),
    tags,
    attachments: [],
  } satisfies IDiscussionBoardArticle.ICreate;
  const createdArticle =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      { body: articleCreateBody },
    );
  typia.assert(createdArticle);
  // 4. Administrator retrieves the article by ID
  const retrievedArticle =
    await api.functional.discussionBoard.administrator.articles.at(
      adminConnection,
      { articleId: createdArticle.id },
    );
  typia.assert(retrievedArticle);
  // 5. Assertions
  TestValidator.equals(
    "article id matches",
    retrievedArticle.id,
    createdArticle.id,
  );
  TestValidator.equals(
    "article title matches",
    retrievedArticle.title,
    createdArticle.title,
  );
  TestValidator.equals(
    "article content matches",
    retrievedArticle.content,
    createdArticle.content,
  );
  // Attachments and files (should be empty as we provided none)
  TestValidator.predicate(
    "attachments are empty",
    retrievedArticle.files.length === 0,
  );
  // Images check
  TestValidator.predicate(
    "has images in article",
    Array.isArray(retrievedArticle.images),
  );
  // Tags check
  TestValidator.equals(
    "tags count matches",
    retrievedArticle.tags.length,
    tags.length,
  );
  // As tag name property does not exist, verify tag ids are valid UUIDs
  for (const tag of retrievedArticle.tags) {
    TestValidator.predicate(
      "tag id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        tag.id,
      ),
    );
  }
}
