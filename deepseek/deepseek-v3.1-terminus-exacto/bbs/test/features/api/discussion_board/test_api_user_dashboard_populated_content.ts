import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

/**
 * Test the super admin dashboard endpoint with basic platform data.
 * The dashboard endpoint returns super admin information rather than
 * platform statistics, so validate the basic super admin data structure.
 */
export async function test_api_user_dashboard_populated_content(
  connection: api.IConnection,
): Promise<void> {
  // Create a user to authenticate and access the dashboard
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Access dashboard with authenticated user
  const dashboardUserConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: user.token.access },
  };
  const dashboard = await api.functional.discussionBoard.user.dashboard.at(
    dashboardUserConnection,
  );
  typia.assert(dashboard);
  // Validate super admin dashboard response structure
  TestValidator.predicate(
    "dashboard should have valid UUID id",
    /^[0-9a-f-]{36}$/i.test(dashboard.id),
  );
  TestValidator.predicate(
    "dashboard should have valid email format",
    dashboard.email.includes("@"),
  );
  TestValidator.predicate(
    "dashboard should have privilege level",
    dashboard.privilege_level.length > 0,
  );
  TestValidator.predicate(
    "dashboard should have ISO date-time created_at",
    dashboard.created_at.length > 0,
  );
  TestValidator.predicate(
    "dashboard should have ISO date-time updated_at",
    dashboard.updated_at.length > 0,
  );
  // deleted_at can be null or ISO date-time
  if (dashboard.deleted_at !== null) {
    TestValidator.predicate(
      "dashboard deleted_at should be ISO date-time if not null",
      dashboard.deleted_at.length > 0,
    );
  }
}
