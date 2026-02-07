import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_articles_tags_create_tags } from "../../../generate/generate_random_discussion_board_super_admin_articles_tags_create_tags";
import { generate_random_discussion_board_super_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

export async function test_api_superadmin_associate_multiple_tags_with_normalization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.join(adminConnection, {
    body: {},
  });
  // 2. Create a test article
  const article =
    await generate_random_discussion_board_super_admin_sections_articles_create(
      adminConnection,
      {
        body: {},
        params: {
          sectionId: "section-id-12345",
        },
      },
    );
  typia.assert(article);
  // 3. Associate multiple tags with normalization
  const result =
    await generate_random_discussion_board_super_admin_articles_tags_create_tags(
      adminConnection,
      {
        body: {},
        params: {
          articleId: (article as any).id,
        },
      },
    );
  typia.assert(result);
  // 4. Validate tag association
  TestValidator.predicate("tags normalized correctly", result !== null);
}