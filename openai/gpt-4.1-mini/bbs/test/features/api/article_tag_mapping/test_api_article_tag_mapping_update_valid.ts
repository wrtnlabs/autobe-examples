import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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
import { generate_random_discussion_board_administrator_article_tag_mappings_create_article_tag_mapping } from "../../../generate/generate_random_discussion_board_administrator_article_tag_mappings_create_article_tag_mapping";
import { generate_random_discussion_board_administrator_tags_create_tag } from "../../../generate/generate_random_discussion_board_administrator_tags_create_tag";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";
import { prepare_random_discussion_board_article_tag_mapping } from "../../../prepare/prepare_random_discussion_board_article_tag_mapping";

export async function test_api_article_tag_mapping_update_valid(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test updating an existing article-tag mapping with valid new article ID and tag ID by an authorized administrator.
  // Steps:
  // 1. Administrator join and login (to obtain authorization).
  // 2. Registered user join and login (necessary for article creation).
  // 3. Registered user creates an article (article 1).
  // 4. Administrator creates tag 1.
  // 5. Administrator creates the original article-tag mapping (mapping 1) for article 1 and tag 1.
  // 6. Registered user creates another article (article 2).
  // 7. Administrator creates tag 2.
  // 8. Administrator updates the article-tag mapping (mapping 1) to reference article 2 and tag 2.
  // 9. Validate that the mapping update response matches expected updated article and tag IDs without producing constraint violations.
  // 1. Administrator join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: { password: "12345678" },
  });
  await authorize_administrator_login(adminConnection, {
    body: {
      email: admin.email,
      password: "12345678",
      href: "http://localhost/login",
      referrer: "http://localhost/referrer",
      ip: null,
    },
  });
  // 2. Registered user join and login
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_registered_user_join(userConnection, {
    body: { password: "12345678" },
  });
  await authorize_registered_user_login(userConnection, {
    body: {
      email: user.email,
      password: "12345678",
    },
  });
  // 3. Registered user creates article #1
  const article1 =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      { body: {} },
    );
  typia.assert(article1);
  // 4. Administrator creates tag #1
  const tag1 =
    await generate_random_discussion_board_administrator_tags_create_tag(
      adminConnection,
      { body: {} },
    );
  typia.assert(tag1);
  // 5. Administrator creates original mapping #1 (article1 + tag1)
  const originalMapping =
    await generate_random_discussion_board_administrator_article_tag_mappings_create_article_tag_mapping(
      adminConnection,
      {
        body: {
          discussion_board_article_id: article1.id,
          discussion_board_tag_id: tag1.id,
        },
      },
    );
  typia.assert(originalMapping);
  // 6. Registered user creates article #2 (new article)
  const article2 =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      { body: {} },
    );
  typia.assert(article2);
  // 7. Administrator creates tag #2 (new tag)
  const tag2 =
    await generate_random_discussion_board_administrator_tags_create_tag(
      adminConnection,
      { body: {} },
    );
  typia.assert(tag2);
  // 8. Administrator updates the article-tag mapping (mapping 1) with new article and tag IDs
  const updatedMapping =
    await api.functional.discussionBoard.administrator.article_tag_mappings.updateArticleTagMapping(
      adminConnection,
      {
        mappingId: originalMapping.id,
        body: {
          discussionBoardArticleId: article2.id,
          discussionBoardTagId: tag2.id,
        },
      },
    );
  typia.assert(updatedMapping);
  // 9. Validate that the mapping has been updated correctly
  TestValidator.equals(
    "updated mapping id",
    updatedMapping.id,
    originalMapping.id,
  );
  TestValidator.equals(
    "updated article id",
    updatedMapping.article.id,
    article2.id,
  );
  TestValidator.equals(
    "updated tag id",
    (updatedMapping.tag as { id: string }).id,
    tag2.id,
  );
  TestValidator.predicate(
    "mapping timestamps updated",
    new Date(updatedMapping.updatedAt) > new Date(updatedMapping.createdAt),
  );
}
