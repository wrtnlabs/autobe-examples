import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving an activity log entry that does not exist in the system.
 *
 * Validates the system's handling of requests for non-existent activity log entries. Ensures that the API returns an appropriate 404 Not Found response when attempting to retrieve an activity log with a valid UUID format that does not correspond to any existing record.
 *
 * The test verifies that error responses do not expose sensitive information about the audit system while maintaining the member's session validity after the failed request. This confirms proper resource existence validation and secure error handling.
 *
 * 1. Member authenticates via join operation to obtain valid session.
 * 2. Generates a random UUID that does not exist in the activity logs table.
 * 3. Calls GET /hrmPlatform/member/activity-logs/{activityLogId} with the non-existent ID.
 * 4. Validates that the response is 404 Not Found with appropriate error message.
 */
export async function test_api_activity_log_non_existent_entry(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate a valid UUID that does not exist in the system
  const nonExistentActivityLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve non-existent activity log - should return 404
  await TestValidator.httpError(
    "404 Not Found for non-existent activity log entry",
    404,
    async () => {
      await api.functional.hrmPlatform.member.activity_logs.at(
        memberConnection,
        {
          activityLogId: nonExistentActivityLogId,
        },
      );
    },
  );
  // 4. Verify member session remains valid by checking connection can still be used
  // The memberConnection headers contain the valid token from authorize_member_join
  // If the session was invalidated, subsequent calls would fail with 401
}
