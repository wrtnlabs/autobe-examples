import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_article_tag_mappings_create } from "../../../generate/generate_random_discussion_board_article_tag_mappings_create";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_tags_create } from "../../../generate/generate_random_discussion_board_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag_mapping } from "../../../prepare/prepare_random_discussion_board_article_tag_mapping";
import { prepare_random_discussion_board_tag } from "../../../prepare/prepare_random_discussion_board_tag";

export async function test_api_article_tag_mapping_update_unauthorized_article_or_tag_change(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Attempt unauthorized updates to article-tag mappings by associating mappings with articles or tags not owned by the user
  // Setup: Register userA and userB
  const userAConnection: api.IConnection = { host: connection.host };
  const userAAuth = await authorize_registered_user_join(userAConnection, {
    body: {},
  });
  typia.assert(userAAuth);
  userAConnection.headers = {
    Authorization: `Bearer ${userAAuth.token.access}`,
  };
  const userBConnection: api.IConnection = { host: connection.host };
  const userBAuth = await authorize_registered_user_join(userBConnection, {
    body: {},
  });
  typia.assert(userBAuth);
  userBConnection.headers = {
    Authorization: `Bearer ${userBAuth.token.access}`,
  };
  // UserA creates an article
  const userAArticleRaw =
    await generate_random_discussion_board_registered_user_articles_create(
      userAConnection,
      {
        body: {},
      },
    );
  typia.assert(userAArticleRaw);
  const userAArticle = userAArticleRaw as IDiscussionBoardArticle & { id: string };
  // UserB creates an article
  const userBArticleRaw =
    await generate_random_discussion_board_registered_user_articles_create(
      userBConnection,
      {
        body: {},
      },
    );
  typia.assert(userBArticleRaw);
  const userBArticle = userBArticleRaw as IDiscussionBoardArticle & { id: string };
  // UserA creates a tag
  const userATagRaw = await generate_random_discussion_board_tags_create(
    userAConnection,
    {
      body: {},
    },
  );
  typia.assert(userATagRaw);
  const userATag = userATagRaw as IDiscussionBoardTag & { id: string };
  // UserB creates a tag
  const userBTagRaw = await generate_random_discussion_board_tags_create(
    userBConnection,
    {
      body: {},
    },
  );
  typia.assert(userBTagRaw);
  const userBTag = userBTagRaw as IDiscussionBoardTag & { id: string };
  // UserA creates an article-tag mapping (their own article and tag)
  const mappingRaw =
    await generate_random_discussion_board_article_tag_mappings_create(
      userAConnection,
      {
        body: {
          discussionBoardArticleId: userAArticle.id,
          discussionBoardTagId: userATag.id,
        },
      },
    );
  typia.assert(mappingRaw);
  const mapping = mappingRaw as IDiscussionBoardArticleTagMapping & { id: string };
  // Attempt 1: UserA tries to update mapping to refer to UserB's article (unauthorized)
  await TestValidator.error(
    "UserA cannot update article-tag mapping to associate with UserB's article",
    async () => {
      await api.functional.discussionBoard.article_tag_mappings.updateArticleTagMapping(
        userAConnection,
        {
          mappingId: mapping.id,
          body: {
            discussionBoardArticleId: userBArticle.id,
            discussionBoardTagId: userATag.id,
          },
        },
      );
    },
  );
  // Attempt 2: UserA tries to update mapping to refer to UserB's tag (unauthorized)
  await TestValidator.error(
    "UserA cannot update article-tag mapping to associate with UserB's tag",
    async () => {
      await api.functional.discussionBoard.article_tag_mappings.updateArticleTagMapping(
        userAConnection,
        {
          mappingId: mapping.id,
          body: {
            discussionBoardArticleId: userAArticle.id,
            discussionBoardTagId: userBTag.id,
          },
        },
      );
    },
  );
}
