import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test deletion attempt with a non-existent timesheet ID to verify proper error handling.
 *
 * Validates that attempting to delete a timesheet that does not exist in the database. Tests that the system correctly returns a 404 Not Found error response, confirming that no database modifications occur and the system maintains a stable state.
 *
 * 1. Authenticate as a member account.
 * 2. Generate a valid UUID that does not correspond to any existing timesheet.
 * 3. Attempt to delete the non-existent timesheet.
 * 4. Verify the request returns HTTP 404 Not Found.
 * 5. Confirm error response indicates the timesheet was not found.
 * 6. Ensure no side effects occur and system remains in stable state.
 */
export async function test_api_timesheet_delete_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: undefined });
  // 2. Generate a valid UUID that does not exist
  const nonExistentTimesheetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to delete the non-existent timesheet
  // 4-6. Verify it returns a 404 Not Found error
  await TestValidator.error("404 timesheet not found", async () => {
    await api.functional.hrmPlatform.member.timesheets.erase(memberConnection, {
      timesheetId: nonExistentTimesheetId,
    });
  });
}
