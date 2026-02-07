import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanDuration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_ban_duration_analytics_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Search with partial name matching
  const searchResponse1 =
    await api.functional.discussionBoard.superAdmin.analytics.ban_durations.index(
      superAdminConnection,
      {
        body: {
          search: "ban",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(searchResponse1);
  // Test 2: Duration range filtering
  const rangeResponse =
    await api.functional.discussionBoard.superAdmin.analytics.ban_durations.index(
      superAdminConnection,
      {
        body: {
          duration_hours_min: 24,
          duration_hours_max: 168,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(rangeResponse);
  // Test 3: Permanent status filtering
  const permanentResponse =
    await api.functional.discussionBoard.superAdmin.analytics.ban_durations.index(
      superAdminConnection,
      {
        body: {
          is_permanent: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(permanentResponse);
  // Test 4: Combined filters
  const combinedResponse =
    await api.functional.discussionBoard.superAdmin.analytics.ban_durations.index(
      superAdminConnection,
      {
        body: {
          search: "permanent",
          duration_hours_min: 0,
          is_permanent: true,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // Test 5: Edge case - non-existent search
  const nonExistentResponse =
    await api.functional.discussionBoard.superAdmin.analytics.ban_durations.index(
      superAdminConnection,
      {
        body: {
          search: "nonexistent_ban_name_12345",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(nonExistentResponse);
  // Test 6: Extreme duration range
  const extremeResponse =
    await api.functional.discussionBoard.superAdmin.analytics.ban_durations.index(
      superAdminConnection,
      {
        body: {
          duration_hours_min: 1000,
          duration_hours_max: 10000,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(extremeResponse);
  // Test 7: Empty filters (should return all)
  const allResponse =
    await api.functional.discussionBoard.superAdmin.analytics.ban_durations.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(allResponse);
  // Test 8: Boundary values
  const boundaryResponse =
    await api.functional.discussionBoard.superAdmin.analytics.ban_durations.index(
      superAdminConnection,
      {
        body: {
          duration_hours_min: 0,
          duration_hours_max: 1,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(boundaryResponse);
}
