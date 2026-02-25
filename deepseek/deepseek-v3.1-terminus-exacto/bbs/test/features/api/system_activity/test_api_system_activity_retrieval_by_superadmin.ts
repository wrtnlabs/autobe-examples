import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator system activity retrieval functionality.
 *
 * Verifies that super administrators can access detailed audit trail records
 * containing comprehensive activity metadata including actor information,
 * target entity details, success status, and contextual data like IP address
 * and user agent.
 */
export async function test_api_system_activity_retrieval_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate a random activity ID to retrieve
  const activityId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the system activity record
  const activity =
    await api.functional.discussionBoard.superAdmin.system_activities.at(
      superAdminConnection,
      { activityId },
    );
  // Validate the complete response structure - typia.assert() performs ALL validation
  typia.assert(activity);
  // Business logic validation only - typia.assert() already validated all types and formats
  TestValidator.predicate(
    "at least one actor reference exists",
    activity.user !== null ||
      activity.admin !== null ||
      activity.super_admin !== null,
  );
}
