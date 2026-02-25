import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_comment_moderation_dashboard_initial_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a fresh administrator account with no prior moderation activities
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Access the comment moderation dashboard with authenticated admin
  const dashboard =
    await api.functional.discussionBoard.admin.comments.moderation.dashboard.at(
      adminConnection,
    );
  typia.assert(dashboard);
  // 3. Validate business logic: admin in dashboard matches authenticated admin
  TestValidator.equals(
    "dashboard admin matches authenticated admin",
    dashboard.admin.id,
    admin.id,
  );
  TestValidator.equals(
    "dashboard admin email matches",
    dashboard.admin.email,
    admin.email,
  );
  TestValidator.equals(
    "dashboard admin display_name matches",
    dashboard.admin.display_name,
    admin.display_name,
  );
  // 4. Verify authentication requirement - unauthorized access should fail
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("dashboard requires authentication", async () => {
    await api.functional.discussionBoard.admin.comments.moderation.dashboard.at(
      unauthorizedConnection,
    );
  });
}
