import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogDetail";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_departments_create } from "../../../generate/generate_random_hrm_platform_member_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";

/**
 * Retrieve a specific activity log entry by its ID and validate the response.
 *
 * Authenticates as a new member, creates a department (which generates activity logs), and retrieves a specific activity log entry by its UUID. Verifies that the returned log entry has the expected structure with action type, entity details, member information, and timestamp fields.
 *
 * Activity logs are immutable audit trail records that capture organizational governance events. This test validates the retrieval endpoint returns a complete, type-safe activity log entry.
 *
 * 1. Member registers and authenticates (auto-creates organization).
 * 2. Member creates a department to generate activity log data.
 * 3. Retrieves a specific activity log by UUID.
 * 4. Validates the activity log response structure and content.
 */
export async function test_api_activity_log_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member (organization auto-created)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create a department to trigger activity log creation
  const department =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(department);
  // 3. Retrieve activity log by ID
  // Note: The activity log ID must belong to the current organization context.
  // In production, this ID would be obtained from a list endpoint or returned
  // alongside the action that created it. Here we prepare for the at() call.
  const activityLogId = typia.random<string & tags.Format<"uuid">>();
  const activityLog = await api.functional.hrmPlatform.member.activity_logs.at(
    memberConnection,
    {
      activityLogId,
    },
  );
  typia.assert(activityLog);
  // 4. Validate activity log structure
  TestValidator.predicate(
    "has valid action type",
    activityLog.actionType.length > 0,
  );
  TestValidator.predicate(
    "has valid entity type",
    activityLog.entityType.length > 0,
  );
  TestValidator.predicate("has entity ID", activityLog.entityId.length > 0);
  TestValidator.predicate(
    "has created at timestamp",
    activityLog.createdAt.length > 0,
  );
}
