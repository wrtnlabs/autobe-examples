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

export async function test_api_materialized_view_schedule_get_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as platform admin
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.simulate = true; // Enable simulation mode for deterministic tests
  const authResponse = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  // Generate a known materialized view schedule using the random generator
  const sampleSchedule =
    api.functional.redditCommunity.materialized_view_schedules.at.random();
  const scheduleId = sampleSchedule.id;
  // Call the endpoint to retrieve the materialized view schedule
  const retrievedSchedule =
    await api.functional.redditCommunity.materialized_view_schedules.at(
      adminConnection,
      { scheduleId },
    );
  typia.assert(retrievedSchedule);
}
