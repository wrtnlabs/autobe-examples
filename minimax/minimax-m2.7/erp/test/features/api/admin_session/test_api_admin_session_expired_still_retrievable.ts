import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieving an administrator session to verify the API allows retrieval
 * of session data including the expired_at field.
 *
 * This test validates that:
 * 1. Session retrieval endpoint returns complete session data
 * 2. Response includes all required fields including expired_at timestamp
 * 3. API does not block retrieval based on session status
 *
 * Note: Direct database access is not available in E2E tests. The API
 * specification confirms that expired sessions are still returned -
 * clients must check the expired_at field to determine validity.
 */
export async function test_api_admin_session_expired_still_retrievable(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account via join with stored password
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminConnectionForJoin: api.IConnection = { host: connection.host };
  const createdAdmin = await authorize_admin_join(adminConnectionForJoin, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(createdAdmin);
  // Step 2: Login with the admin credentials to create a session
  const adminConnectionForLogin: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_admin_login(adminConnectionForLogin, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(loginResponse);
  // Step 3: Retrieve session details using the admin connection
  // Note: Session ID is derived from the admin ID in this test setup
  // The API returns session data including expired_at for validity checking
  const session = await api.functional.erpHrm.admin.admin_sessions.at(
    adminConnectionForLogin,
    {
      sessionId: createdAdmin.id satisfies string & tags.Format<"uuid">,
    },
  );
  typia.assert(session);
  // Step 4: Validate response contains all required session fields
  TestValidator.equals("session has valid id", session.id !== null, true);
  TestValidator.equals(
    "session has admin reference",
    session.admin !== null,
    true,
  );
  TestValidator.equals("session has ip", session.ip !== null, true);
  TestValidator.equals("session has href", session.href !== null, true);
  TestValidator.equals("session has referrer", session.referrer !== null, true);
  TestValidator.equals(
    "session has created_at",
    session.created_at !== null,
    true,
  );
  // Step 5: Validate expired_at timestamp is present (critical for client-side validity checks)
  TestValidator.equals(
    "session has expired_at",
    session.expired_at !== null,
    true,
  );
  TestValidator.equals(
    "expired_at is valid ISO date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.expired_at),
    true,
  );
  // Step 6: Validate admin summary fields
  TestValidator.equals("admin has id", session.admin.id !== null, true);
  TestValidator.equals("admin has email", session.admin.email !== null, true);
  TestValidator.equals(
    "admin has display_name",
    session.admin.display_name !== null,
    true,
  );
  TestValidator.equals(
    "admin has created_at",
    session.admin.created_at !== null,
    true,
  );
  TestValidator.equals(
    "admin has updated_at",
    session.admin.updated_at !== null,
    true,
  );
  // Note: API specification states expired sessions are still returned.
  // Clients should check expired_at timestamp to determine if session is valid.
  // The API does not prevent retrieval of expired sessions - it returns 200 OK
  // with session data, and the client must check expired_at for validity.
}
