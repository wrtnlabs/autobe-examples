import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminSession";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_session_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Generate UUID for admin ID (will be used as session ID)
  const adminId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Authenticate admin to create a session
  const authResult: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/admin/join",
        referrer: "https://example.com",
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  typia.assert(authResult);
  // Step 4: Retrieve the admin's session using the admin ID as the session ID
  // ASSUMPTION: The system links session ID with admin ID (as per test requirement and API limitation)
  const session: ICommunityPlatformAdminSession =
    await api.functional.communityPlatform.admin.admin.sessions.at(
      adminConnection,
      { sessionId: adminId },
    );
  typia.assert(session);
  // Step 5: Validate session properties
  // All validations are performed by typia.assert during session retrieval, which enforces the full ICommunityPlatformAdminSession structure
  // No additional field-by-field validation needed - typia.assert ensures type compliance
  // Verify session has correct fields (enforced by typia.assert)
  TestValidator.equals("admin session retrieved", session.admin_id, adminId);
  TestValidator.predicate("session is active", session.is_active);
  TestValidator.equals(
    "session issued_at is not empty",
    session.issued_at.length > 0,
    true,
  );
  TestValidator.equals(
    "session expires_at is not empty",
    session.expires_at.length > 0,
    true,
  );
  TestValidator.equals(
    "session created_at is not empty",
    session.created_at.length > 0,
    true,
  );
  TestValidator.equals(
    "session user_agent is string",
    typeof session.user_agent === "string",
    true,
  );
  TestValidator.equals(
    "session ip_address is IPv4 format",
    /(?:[0-9]{1,3}\.){3}[0-9]{1,3}/.test(session.ip_address),
    true,
  );
  // These last property checks validate business logic, not type safety (typia.assert already validates types)
}
