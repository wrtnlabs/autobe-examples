import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an administrator can successfully retrieve detailed system activity information
 * by providing a valid activity ID. The test validates that the response contains all
 * expected fields including total activities, success/error counts, success rate,
 * period information, date ranges, and previous period comparison metrics.
 */
export async function test_api_system_activity_retrieval_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Generate a valid UUID for the activity ID
  const activityId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve system activity information
  const systemActivity =
    await api.functional.discussionBoard.admin.system_activities.at(
      adminConnection,
      {
        activityId,
      },
    );
  // Validate the response structure - this performs COMPLETE validation
  typia.assert(systemActivity);
  // No additional validation needed after typia.assert() as it validates:
  // - All property existence and types
  // - All format constraints (date-time, etc.)
  // - All numeric constraints (non-negative values, etc.)
  // - All union type constraints (trend_direction values)
  // - Complete schema compliance
}
