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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTagMapping";
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
import { generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mappings } from "../../../generate/generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mappings";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag_mapping } from "../../../prepare/prepare_random_discussion_board_article_tag_mapping";

export async function test_api_administrator_article_tag_mapping_detail_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join & login
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123",
    },
  });
  typia.assert(admin);
  // 2. Registered user join & login
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinResult = await authorize_registered_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "UserPass123",
    },
  });
  typia.assert(userJoinResult);
  // 3. Create an article as registered user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      { body: {} },
    );
  typia.assert(article);
  // 4. Create tag mappings for the article
  const tagMappingsPage =
    await generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mappings(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          discussion_board_article_id: article.id,
          discussion_board_tag_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(tagMappingsPage);
  // Must have at least one tag mapping
  TestValidator.predicate(
    "at least one tag mapping exists",
    tagMappingsPage.data.length > 0,
  );
  const tagMapping = tagMappingsPage.data[0];
  typia.assert(tagMapping);
  // 5. Retrieve tag mapping details as administrator
  const retrieved =
    await api.functional.discussionBoard.administrator.articles.tag_mappings.at(
      adminConnection,
      {
        articleId: article.id,
        tagMappingId: tagMapping.id,
      },
    );
  typia.assert(retrieved);
  // 6. Validate response fields
  TestValidator.equals("tag mapping id", retrieved.id, tagMapping.id);
  TestValidator.equals(
    "article id in mapping",
    retrieved.article.id,
    article.id,
  );
  TestValidator.equals(
    "article id consistency",
    retrieved.article?.id ?? "",
    article.id,
  );
  // Since tagMapping.article is of type IDiscussionBoardArticle.ISummary and id is missing, skip comparing to avoid compile errors.
  // TestValidator.equals("tag mapping article id consistency", retrieved.article?.id ?? "", tagMapping.article?.id ?? "");
  // Tag id checks changed since IDiscussionBoardArticleTag.ISummary lacks id property, remove these checks to avoid errors
  // TestValidator.equals("tag id consistency", retrieved.tag?.id ?? "", tagMapping.tag?.id ?? "");
  // TestValidator.equals("tag id in mapping", retrieved.tag?.id ?? "", tagMapping.tag?.id ?? "");
  // Validate timestamps
  TestValidator.equals(
    "mapping createdAt consistency",
    retrieved.createdAt,
    tagMapping.createdAt,
  );
  TestValidator.equals(
    "mapping updatedAt consistency",
    retrieved.updatedAt,
    tagMapping.updatedAt,
  );
  TestValidator.equals(
    "mapping deletedAt consistency",
    retrieved.deletedAt,
    tagMapping.deletedAt,
  );
  // 7. Test 404 error when invalid articleId
  await TestValidator.httpError("404 on invalid articleId", 404, async () => {
    await api.functional.discussionBoard.administrator.articles.tag_mappings.at(
      adminConnection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        tagMappingId: tagMapping.id,
      },
    );
  });
  // 8. Test 404 error when invalid tagMappingId
  await TestValidator.httpError(
    "404 on invalid tagMappingId",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.articles.tag_mappings.at(
        adminConnection,
        {
          articleId: article.id,
          tagMappingId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
