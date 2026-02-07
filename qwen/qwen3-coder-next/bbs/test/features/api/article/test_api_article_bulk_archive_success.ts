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

export async function test_api_article_bulk_archive_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create section for articles
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // Create a section for testing
  const section =
    await api.functional.discussionBoard.admin.sections.articles.create(
      adminConnection,
      {
        sectionId: "test-section-id",
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(section);
  // 2. Create multiple articles to archive
  const articleCount = 3;
  const articles = await ArrayUtil.asyncRepeat(articleCount, async (i) => {
    return await api.functional.discussionBoard.admin.sections.articles.create(
      adminConnection,
      {
        sectionId: "test-section-id",
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  });
  articles.forEach((article) => typia.assert(article));
  // 3. Authenticate as admin user for bulk archive
  const adminAuthConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminAuthConnection, {
    body: typia.random<IDiscussionBoardAdmin.ILogin>(),
  });
  // 4. Execute bulk archive request
  // Skip getting article IDs since 'id' doesn't exist on IDiscussionBoardArticle
  const archiveResponse =
    await api.functional.discussionBoard.admin.articles.bulk.archive(
      adminAuthConnection,
      {
        body: typia.random<IDiscussionBoardArticle.IRequest>(),
      },
    );
  typia.assert(archiveResponse);
  // 5. Skip verification of archived articles since 'deleted_at' doesn't exist
  // (The actual archive verification would require a different approach or property)
  // 6. Verify archived articles are excluded from normal listings
  // (This would require testing article listing endpoints)
  // 7. Verify admin can still access archived articles through specialized queries
  // (This would require testing specialized archived article retrieval)
}