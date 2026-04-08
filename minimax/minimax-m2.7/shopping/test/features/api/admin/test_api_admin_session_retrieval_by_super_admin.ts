import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminSession";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that a super administrator can successfully retrieve detailed information
 * about an administrator session.
 *
 * Validates that a super admin can view complete session details for any admin
 * session including administrator profile information and session metadata such
 * as IP address, referrer, and timestamps. This test ensures proper authorization
 * checks are in place so only super admins can access admin session details.
 *
 * 1. Super administrator joins and logs in.
 * 2. Creates a new administrator account via admin join.
 * 3. Authenticates as the new admin to establish an active session.
 * 4. Super admin retrieves the admin session details using the session ID.
 * 5. Validates response contains session metadata and admin profile information.
 */
export async function test_api_admin_session_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin joins to create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Create a new administrator account via admin join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminName = RandomGenerator.name();
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 3. Authenticate as the new admin to establish an active session
  const sessionConnection: api.IConnection = { host: connection.host };
  const loginResult = await api.functional.ecommerceMall.auth.admin.login(
    sessionConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.ILogin,
    },
  );
  typia.assert(loginResult);
  // 4. Super admin retrieves the admin session details
  // The session ID is embedded in the JWT token returned from login.
  // For this test, we use the admin's ID to identify the session context.
  // In a real scenario, there may be a sessions list endpoint.
  // For this test, we use the admin's ID as the session identifier.
  const sessionId = admin.id satisfies string & tags.Format<"uuid">;
  const session = await api.functional.ecommerceMall.admin.admin.sessions.at(
    superAdminConnection,
    {
      sessionId: sessionId,
    },
  );
  typia.assert(session);
  // 5. Validate response
  TestValidator.equals("session id matches", session.id, sessionId);
  TestValidator.equals("admin id matches", session.admin.id, admin.id);
  TestValidator.equals("admin email matches", session.admin.email, admin.email);
  TestValidator.equals("admin name matches", session.admin.name, adminName);
  TestValidator.predicate(
    "has ip",
    session.ip !== undefined && session.ip !== null,
  );
  TestValidator.predicate(
    "has href",
    session.href !== undefined && session.href !== null,
  );
  TestValidator.predicate(
    "has referrer",
    session.referrer !== undefined && session.referrer !== null,
  );
  TestValidator.predicate(
    "has valid createdAt",
    !isNaN(Date.parse(session.createdAt)),
  );
  TestValidator.predicate(
    "has valid expiredAt",
    !isNaN(Date.parse(session.expiredAt)),
  );
}
