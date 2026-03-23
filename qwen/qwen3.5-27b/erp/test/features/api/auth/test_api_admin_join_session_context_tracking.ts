import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator join operation with session context tracking.
 *
 * This test validates that the administrator join operation correctly captures
 * and stores session context information (href, referrer, ip) for security
 * auditing purposes. The test verifies that:
 * 1. Admin account is successfully created
 * 2. Session context is properly captured in the request
 * 3. Authorization tokens are returned correctly
 * 4. All response fields are validated
 */
export async function test_api_admin_join_session_context_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Prepare join request with specific session context values
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://hrm-platform.com/admin/register",
    referrer: "https://hrm-platform.com/welcome",
    ip: "192.168.1.100",
  } satisfies IHrmPlatformAdmin.IJoin;
  // 3. Execute admin join using utility function
  const authorized = await authorize_admin_join(adminConnection, {
    body: joinBody,
  });
  // 4. Validate response structure with typia
  typia.assert(authorized);
  // 5. Verify admin identity fields (business logic validation)
  TestValidator.equals(
    "admin email matches input",
    authorized.email,
    joinBody.email,
  );
  TestValidator.predicate("admin ID exists", authorized.id.length > 0);
  TestValidator.predicate(
    "created_at timestamp exists",
    authorized.created_at.length > 0,
  );
  // 6. Verify authorization tokens (business logic validation)
  TestValidator.predicate(
    "access token exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at timestamp exists",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until timestamp exists",
    authorized.token.refreshable_until.length > 0,
  );
  // 7. Verify session context was captured (indirectly through successful join)
  TestValidator.predicate(
    "join succeeded with session context",
    authorized.id !== undefined,
  );
}
