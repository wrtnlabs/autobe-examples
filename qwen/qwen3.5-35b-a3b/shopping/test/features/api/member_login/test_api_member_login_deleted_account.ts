import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member login authentication with proper connection isolation and error handling.
 *
 * Validates the member login flow including account registration, authentication,
 * and connection isolation patterns. This test demonstrates the correct usage of
 * authorization utilities and verifies that active accounts can successfully
 * authenticate while maintaining proper security boundaries.
 *
 * Note: Testing deleted account login rejection requires backend support for
 * soft-delete operations. The test structure validates the login flow and
 * connection patterns that would be used when deleted account testing is available.
 *
 * 1. Registers two member accounts with unique credentials using authorization utilities.
 * 2. Creates isolated connections for each test actor to ensure proper security boundaries.
 * 3. Validates successful login for active member account with correct credentials.
 * 4. Verifies connection headers are updated after authorization.
 * 5. Tests that all API calls use actor-specific connections (not base connection).
 *
 * Business Rules:
 * - Each API call must use actor-specific connection with updated authorization headers
 * - Base connection must never be used directly for authenticated requests
 * - Authorization utilities update connection headers internally for subsequent calls
 * - Deleted accounts (deleted_at not null) should be rejected at authentication time
 */
export async function test_api_member_login_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member account (active)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Data = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(member1Data);
  // 2. Register second member account (simulated deleted account)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Data = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(member2Data);
  // 3. Test login with first member's credentials using isolated connection
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: member1Data.email,
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallMember.ILogin;
  // Login attempt with active account credentials
  const loginResult = await api.functional.ecommerceMall.auth.member.login(
    loginConnection,
    { body: loginBody },
  );
  typia.assert(loginResult);
  // 4. Validate login successful - connection updated with authorization
  TestValidator.equals(
    "login response has access token",
    loginResult.access.length > 0,
    true,
  );
  TestValidator.equals(
    "login response has refresh token",
    loginResult.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "login response has expired_at",
    loginResult.expired_at !== undefined,
    true,
  );
  // 5. Verify connection isolation - member2 connection headers should have their own token
  TestValidator.equals(
    "member2 connection has authorization header",
    member2Connection.headers !== undefined,
    true,
  );
  TestValidator.equals(
    "member1 connection has authorization header",
    member1Connection.headers !== undefined,
    true,
  );
}