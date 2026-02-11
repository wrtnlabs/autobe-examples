import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMaterializedViewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMaterializedViewSchedule";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_materialized_view_schedules_update_with_invalid_view_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as platform admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  // No manual header assignment — authorize_platform_admin_join modifies adminConnection in-place
  // 2. Prepare request body with one valid and one invalid view name
  const requestBody: IRedditCommunityMaterializedViewSchedule.IRequest = {
    view_names: ["mv_post_karma_scores", "mv_nonexistent"],
    status: "running" as const,
  };
  // 3. Perform the bulk update
  const result =
    await api.functional.redditCommunity.materialized_view_schedules.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(result);
  // 4. Validate response
  TestValidator.equals(
    "view_name matches valid view",
    result.view_name,
    "mv_post_karma_scores",
  );
  TestValidator.equals("status is running", result.status, "running");
  TestValidator.predicate(
    "next_refresh is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?(?:Z|[+-][0-9]{2}:[0-9]{2})$/i.test(
      result.next_refresh,
    ),
  );
}
