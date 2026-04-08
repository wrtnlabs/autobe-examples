import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminSession";
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
 * Test retrieving a non-existent session returns 404 error.
 *
 * Validates that the system properly handles requests for sessions that do not
 * exist. When a super administrator attempts to access a session with an invalid
 * or non-existent UUID, the system should return an appropriate 404 Not Found
 * response.
 *
 * **Precondition**: A super administrator account must be registered and authenticated.
 *
 * **Steps**:
 * 1. Register and authenticate as a super administrator to establish a valid session
 * 2. Attempt to retrieve a session using a non-existent UUID (e.g., '00000000-0000-0000-0000-000000000000')
 *
 * **Expected Results**:
 * - HTTP 404 Not Found response
 * - Error message indicating session not found
 *
 * **Validation Points**:
 * - System properly validates session existence before returning data
 * - Returns appropriate 404 status code for non-existent sessions
 */
export async function test_api_super_admin_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Attempt to retrieve a non-existent session
  const nonExistentSessionId =
    "00000000-0000-0000-0000-000000000000" as string & tags.Format<"uuid">;
  await TestValidator.httpError("session not found", 404, async () => {
    await api.functional.ecommerceMall.superAdmin.super_admin.sessions.at(
      superAdminConnection,
      {
        sessionId: nonExistentSessionId,
      },
    );
  });
}
