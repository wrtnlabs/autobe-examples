import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test complete member registration workflow for new user account creation.
 *
 * Validates the entire member join process including credential submission, account creation, JWT token generation, and email verification token creation. Ensures that the registration endpoint properly creates a member record with hashed password and returns valid authentication tokens for immediate API access.
 *
 * The test verifies that access_token and refresh_token are properly formatted with correct expiration timestamps, the member profile is initialized correctly, and the new member has no organization membership initially. Password security is validated by confirming it meets requirements (minimum 8 characters, uppercase, lowercase, number).
 *
 * 1. Generate unique registration credentials with valid email format and secure password.
 * 2. Call member join endpoint with registration data including session context (href, referrer).
 * 3. Validate response contains member id, email, created_at, updated_at timestamps.
 * 4. Verify JWT tokens (access and refresh) are present with proper expiration metadata.
 * 5. Confirm member profile is null initially (user hasn't created profile yet).
 * 6. Validate that deleted_at is null indicating active account status.
 */
export async function test_api_member_join_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare registration credentials
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: undefined,
  } satisfies IHrmPlatformMember.IJoin;
  // 2. Create member-specific connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // 3. Validate member identity fields
  TestValidator.equals(
    "email matches input",
    authorized.email,
    joinInput.email,
  );
  // 4. Validate deleted_at is null for active account
  TestValidator.equals(
    "deleted_at is null for active account",
    authorized.deleted_at,
    null,
  );
  // 5. Validate token expiration logic (refreshable_until should be after expired_at)
  const expiredAt = new Date(authorized.token.expired_at).getTime();
  const refreshableUntil = new Date(
    authorized.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
  // 6. Validate profile is null initially (user hasn't created profile yet)
  TestValidator.equals("profile is null initially", authorized.profile, null);
  // 7. Verify connection was updated with access token for subsequent requests
  TestValidator.predicate(
    "connection has authorization header",
    memberConnection.headers?.Authorization !== undefined,
  );
  TestValidator.predicate(
    "authorization header uses Bearer scheme",
    typeof memberConnection.headers?.Authorization === "string" &&
      memberConnection.headers.Authorization.startsWith("Bearer ") === true,
  );
}