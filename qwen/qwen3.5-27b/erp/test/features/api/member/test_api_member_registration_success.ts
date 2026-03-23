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
 * Test successful member registration with valid credentials.
 *
 * This test validates the complete member registration flow:
 * 1. Register a new member with unique email and password
 * 2. Verify member account creation with UUID generation
 * 3. Validate JWT access and refresh token generation
 * 4. Confirm session context information capture
 * 5. Test that returned tokens can be used for authentication
 */
export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection for isolation
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Generate valid registration data with proper format tags
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // 3. Register new member using utility function
  const member = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip,
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 4. Validate response structure and types (typia.assert validates all tagged types)
  typia.assert(member);
  // 5. Verify business logic - email matches input
  TestValidator.equals("email matches input", member.email, email);
  // 6. Verify business logic - member is active (not deleted)
  TestValidator.equals("member is active", member.deleted_at, null);
  // 7. Verify authorization token exists and has content
  TestValidator.predicate(
    "access token is not empty",
    member.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is not empty",
    member.token.refresh.length > 0,
  );
  // 8. Verify connection was updated with authorization token
  TestValidator.equals(
    "connection has authorization header",
    memberConnection.headers?.Authorization,
    member.token.access,
  );
  // 9. Verify token expiration times are logically correct
  const now = new Date();
  const expiredAt = new Date(member.token.expired_at);
  const refreshableUntil = new Date(member.token.refreshable_until);
  TestValidator.predicate("access token expires in future", expiredAt > now);
  TestValidator.predicate(
    "refresh token valid until future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
}
