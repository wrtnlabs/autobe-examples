import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
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
import { generate_random_discussion_board_administrator_article_tag_mappings_create_article_tag_mapping } from "../../../generate/generate_random_discussion_board_administrator_article_tag_mappings_create_article_tag_mapping";
import { prepare_random_discussion_board_article_tag_mapping } from "../../../prepare/prepare_random_discussion_board_article_tag_mapping";

export async function test_api_article_tag_mapping_creation_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Administrator registers and obtains valid token
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass1234",
    },
  });
  typia.assert(admin);
  // Create an article-tag mapping with valid article ID and tag ID using admin connection
  const createdMapping =
    await generate_random_discussion_board_administrator_article_tag_mappings_create_article_tag_mapping(
      adminConnection,
      { body: {} },
    );
  typia.assert(createdMapping);
  // Validate the fields of the created mapping
  TestValidator.predicate(
    "mapping has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdMapping.id,
    ),
  );
  TestValidator.predicate(
    "mapping has createdAt timestamp",
    !!createdMapping.createdAt,
  );
  TestValidator.predicate(
    "mapping has updatedAt timestamp",
    !!createdMapping.updatedAt,
  );
  TestValidator.predicate(
    "mapping has article summary",
    !!createdMapping.article,
  );
  TestValidator.predicate("mapping has tag summary", !!createdMapping.tag);
  typia.assert(createdMapping.article);
  typia.assert(createdMapping.tag);
  // Use ISummary types for casting to access id
  const article = createdMapping.article as IDiscussionBoardArticle.ISummary;
  const tag = createdMapping.tag as IDiscussionBoardArticleTag.ISummary;
  // Verify unauthorized requests fail
  await TestValidator.error("unauthorized creation without token", async () => {
    await api.functional.discussionBoard.administrator.article_tag_mappings.createArticleTagMapping(
      connection,
      {
        body: {
          discussion_board_article_id: article.id,
          discussion_board_tag_id: tag.id,
        },
      },
    );
  });
  const fakeConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: "Bearer invalidtoken" },
  };
  await TestValidator.error(
    "unauthorized creation with invalid token",
    async () => {
      await api.functional.discussionBoard.administrator.article_tag_mappings.createArticleTagMapping(
        fakeConnection,
        {
          body: {
            discussion_board_article_id: article.id,
            discussion_board_tag_id: tag.id,
          },
        },
      );
    },
  );
}
