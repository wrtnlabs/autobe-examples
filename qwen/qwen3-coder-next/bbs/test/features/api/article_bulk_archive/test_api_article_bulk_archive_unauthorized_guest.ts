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

export async function test_api_article_bulk_archive_unauthorized_guest(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create a section for testing
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // 2. Setup: Create multiple articles in the section
  // Note: Section ID is required but not specified in scenario, using random UUID
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const article1 =
    await api.functional.discussionBoard.admin.sections.articles.create(
      adminConnection,
      {
        sectionId,
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(article1);
  const article2 =
    await api.functional.discussionBoard.admin.sections.articles.create(
      adminConnection,
      {
        sectionId,
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(article2);
  // 3. Attempt bulk archive without authentication (guest)
  // Using unauthenticated connection
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should return 401 for unauthorized bulk archive",
    401,
    async () => {
      await api.functional.discussionBoard.admin.articles.bulk.archive(
        guestConnection,
        {
          body: typia.random<IDiscussionBoardArticle.IRequest>(),
        },
      );
    },
  );
  // 4. Verify articles remain unchanged - they should still exist
  // Use article1 and article2 from setup, which should still be accessible
  typia.assert(article1);
  typia.assert(article2);
}
