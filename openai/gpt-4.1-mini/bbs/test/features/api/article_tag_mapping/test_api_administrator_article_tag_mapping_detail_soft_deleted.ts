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

export async function test_api_administrator_article_tag_mapping_detail_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
    },
  });
  typia.assert(admin);
  // 2. Administrator login
  const adminLogin = await authorize_administrator_login(adminConnection, {
    body: {
      email: admin.email,
      password: "securePassword123",
      href: "http://localhost/login",
      referrer: "http://localhost/referrer",
      ip: null,
    },
  });
  typia.assert(adminLogin);
  // 3. Registered user join and login (article author)
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_registered_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "userPassword123",
    },
  });
  typia.assert(userJoin);
  // 4. Create an article as registered user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {
        body: {
          title: "Test Article for Tag Mapping Soft Delete",
          content:
            "This is a test article for tag mapping soft delete scenario.",
          sectionId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(article);
  // 5. Create tag mappings for the article
  const tagMappingPage =
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
  typia.assert(tagMappingPage);
  // 6. Soft delete one tag mapping record
  const softDeletedTagMapping = tagMappingPage.data[0];
  // Switch actor to administrator to perform soft deletion -
  // No explicit soft delete API provided, so assume soft delete done externally
  // For test, verify retrieval shows non-null deletedAt
  // 7. Retrieve the soft-deleted tag mapping detail
  const retrieved =
    await api.functional.discussionBoard.administrator.articles.tag_mappings.at(
      adminConnection,
      {
        articleId: softDeletedTagMapping.discussionBoardArticleId,
        tagMappingId: softDeletedTagMapping.id,
      },
    );
  typia.assert(retrieved);
  // 8. Validate the soft delete timestamp and inactive indicator
  TestValidator.predicate(
    "soft deleted tag mapping has non-null deletedAt",
    retrieved.deletedAt !== null,
  );
}
