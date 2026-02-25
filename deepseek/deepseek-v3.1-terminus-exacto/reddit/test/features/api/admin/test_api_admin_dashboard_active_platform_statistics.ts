import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunityStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityStatistic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_dashboard_active_platform_statistics(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Call the admin dashboard endpoint
  const dashboardStats =
    await api.functional.communityPlatform.admin.dashboard.at(adminConnection);
  typia.assert(dashboardStats);
  // Validate the structure of the dashboard statistics
  TestValidator.predicate("has valid ID", dashboardStats.id.length > 0);
  TestValidator.predicate(
    "subscriber_count is non-negative",
    dashboardStats.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "post_count is non-negative",
    dashboardStats.post_count >= 0,
  );
  TestValidator.predicate(
    "comment_count is non-negative",
    dashboardStats.comment_count >= 0,
  );
  TestValidator.predicate(
    "daily_active_users is non-negative",
    dashboardStats.daily_active_users >= 0,
  );
  TestValidator.predicate(
    "has valid last_calculated_at",
    dashboardStats.last_calculated_at.length > 0,
  );
  TestValidator.predicate(
    "has valid created_at",
    dashboardStats.created_at.length > 0,
  );
  TestValidator.predicate(
    "has valid updated_at",
    dashboardStats.updated_at.length > 0,
  );
}
