import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRefreshToken";
import type { ITodoAppTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItem";
import type { ITodoAppTodoItemAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItemAuditLog";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserEmailVerification";
import type { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
import type { ITodoAppUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserRole";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
/**
 * Tests the authorization activity for a newly registered member user.
 *
 * This test performs the following steps:
 *
 * 1. Registers a new member user with valid information.
 * 2. Creates an authenticated connection for that member.
 * 3. Calls the authorization activity API to confirm authorized access.
 * 4. Validates that the API endpoint executes successfully with no errors (void
 *    response).
 * 5. Attempts to call the authorization activity API using the base connection
 *    without authorization, expecting an error to enforce access control.
 *
 * This confirms the system correctly enforces authentication and authorization,
 * ensuring member users have proper access and unauthorized calls are blocked.
 */
export async function test_api_member_authorization_activity(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member-specific connection and register a new member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ITodoAppUser.IAuthorized = await authorize_member_join(
    memberConnection,
    {},
  );
  typia.assert(member);
  // Step 2: Call authorization activity API with authorized member connection
  await api.functional.auth.user.authorization_activity.authorizationActivity(
    memberConnection,
  );
  // Step 3: Call authorization activity API with base connection without auth, expecting error
  await TestValidator.error(
    "authorization activity fails without authentication",
    async () => {
      await api.functional.auth.user.authorization_activity.authorizationActivity(
        connection,
      );
    },
  );
}
