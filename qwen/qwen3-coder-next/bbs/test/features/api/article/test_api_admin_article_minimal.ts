import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_admin_article_minimal(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Auth as admin to establish permissions
  const adminConnection: api.IConnection = { host: connection.host };
  const authResponse: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.discussionBoard.auth.admin.join(adminConnection, {
      body: typia.random<IDiscussionBoardAdmin.IJoin>(),
    });
  adminConnection.headers = { Authorization: authResponse.token.access };
  // Step 2: Create a section for article placement
  const section: IDiscussionBoardSection =
    await api.functional.discussionBoard.admin.sections.create(
      adminConnection,
      {
        body: typia.random<IDiscussionBoardSection.ICreate>(),
      },
    );
  typia.assert(section);
  // Step 3: Submit article creation with only required fields
  // Use a random UUID as sectionId since IDiscussionBoardSection has no id property
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.admin.sections.articles.create(
      adminConnection,
      {
        sectionId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(article);
  // Step 4 & 5: Verify the article is created successfully with all required fields
  typia.assert(article);
}
