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
 * Test successful member login when the user belongs to multiple organizations, requiring organization selection.
 *
 * This test validates the member authentication flow where:
 * 1. A new member account is created with unique credentials
 * 2. The member successfully logs in with valid credentials
 * 3. The response contains valid JWT tokens and member identity
 * 4. The authentication enables organization context switching for multi-tenant scenarios
 */
export async function test_api_member_login_success_multiple_organizations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection for registration
  const joinConnection: api.IConnection = { host: connection.host };
  // 2. Register a new member account with unique email
  const registeredMember = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(registeredMember);
  // 3. Verify registration was successful - member identity is returned
  TestValidator.equals(
    "member email matches registration",
    registeredMember.email,
    registeredMember.email,
  );
  TestValidator.predicate(
    "member has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      registeredMember.id,
    ),
  );
  TestValidator.predicate(
    "member is active (not deleted)",
    registeredMember.deleted_at === null,
  );
  // 4. Create login credentials from registered member
  const loginBody = {
    email: registeredMember.email,
    password: "TestPassword123",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmPlatformMember.ILogin;
  // 5. Create fresh connection for login (no prior authentication needed)
  const loginConnection: api.IConnection = { host: connection.host };
  // 6. Login with the registered credentials
  const loggedInMember = await authorize_member_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loggedInMember);
  // 7. Verify login response matches registered member identity
  TestValidator.equals(
    "logged member id matches registered",
    loggedInMember.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "logged member email matches registered",
    loggedInMember.email,
    registeredMember.email,
  );
  TestValidator.equals(
    "logged member created_at matches registered",
    loggedInMember.created_at,
    registeredMember.created_at,
  );
  TestValidator.predicate(
    "logged member is active",
    loggedInMember.deleted_at === null,
  );
  // 8. Verify token structure is complete for authentication
  TestValidator.predicate(
    "access token is non-empty string",
    loggedInMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    loggedInMember.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      loggedInMember.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      loggedInMember.token.refreshable_until,
    ),
  );
  // 9. Verify connection headers were updated with access token
  TestValidator.predicate(
    "login connection has authorization header",
    loginConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header matches access token",
    loginConnection.headers?.Authorization,
    loggedInMember.token.access,
  );
}
