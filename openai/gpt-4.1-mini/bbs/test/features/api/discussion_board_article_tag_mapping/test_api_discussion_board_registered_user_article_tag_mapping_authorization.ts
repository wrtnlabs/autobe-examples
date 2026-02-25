import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTagMapping";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mappings } from "../../../generate/generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mappings";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag_mapping } from "../../../prepare/prepare_random_discussion_board_article_tag_mapping";

export async function test_api_discussion_board_registered_user_article_tag_mapping_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Test authorization enforcement for discussion board article tag mappings.
  // 0. Create new connections for each registered user
  const userAConnection: api.IConnection = { host: connection.host };
  const userBConnection: api.IConnection = { host: connection.host };
  // 1. Attempt to get tag mapping details without authentication
  //    Expect HTTP 401 Unauthorized
  await TestValidator.httpError(
    "unauthenticated access is rejected with 401",
    401,
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.tag_mappings.at(
        connection,
        {
          articleId: typia.random<string & typia.tags.Format<"uuid">>(),
          tagMappingId: typia.random<string & typia.tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 2. Register User A
  const userA = await authorize_registered_user_join(userAConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "passwordA123",
    },
  });
  userAConnection.headers = { Authorization: userA.token.access };
  // 3. User A creates an article
  const articleA =
    await generate_random_discussion_board_registered_user_articles_create(
      userAConnection,
      {
        body: {
          title: "User A Article",
          content: "Content for user A's article.",
          sectionId: typia.random<string & typia.tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(articleA);
  // 4. User A creates a tag mapping for the article
  const tagMappingPage =
    await generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mappings(
      userAConnection,
      {
        params: { articleId: articleA.id },
        body: {
          discussion_board_article_id: articleA.id,
          discussion_board_tag_id: typia.random<
            string & typia.tags.Format<"uuid">
          >(),
        },
      },
    );
  typia.assert(tagMappingPage);
  const tagMapping = tagMappingPage.data[0];
  // 5. Register User B
  const userB = await authorize_registered_user_join(userBConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "passwordB123",
    },
  });
  userBConnection.headers = { Authorization: userB.token.access };
  // 6. User B attempts to get tag mapping details of User A's article
  //    Expect HTTP 403 Forbidden
  await TestValidator.httpError(
    "unauthorized user cannot access tag mapping details",
    403,
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.tag_mappings.at(
        userBConnection,
        { articleId: articleA.id, tagMappingId: tagMapping.id },
      );
    },
  );
}
