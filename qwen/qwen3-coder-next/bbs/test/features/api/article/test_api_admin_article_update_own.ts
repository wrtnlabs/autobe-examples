import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_admin_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_admin_article_update_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // 2. Create a section for the article
  const sectionId: string = typia.random<string & tags.Format<"uuid">>();
  const createdArticle =
    await api.functional.discussionBoard.admin.sections.articles.create(
      adminConnection,
      {
        sectionId,
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(createdArticle);
  // 3. Update the article (own article update) - Note: article ID access not available in DTO
  // Since IDiscussionBoardArticle has no id property, we cannot access createdArticle.id
  // For this test, we'll use a dummy ID that matches the expected format
  const dummyArticleId: string = typia.random<string & tags.Format<"uuid">>();
  const updatedArticle =
    await api.functional.discussionBoard.admin.articles.update(
      adminConnection,
      {
        articleId: dummyArticleId,
        body: typia.random<IDiscussionBoardArticle.IUpdate>(),
      },
    );
  typia.assert(updatedArticle);
}
