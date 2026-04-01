import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
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
 * This test verifies that a new member can register with:
 * - Unique email address (properly formatted)
 * - Valid password meeting security requirements
 * - Unique username for public display
 *
 * The response should contain:
 * - Member ID (UUID format)
 * - JWT access_token for API authentication
 * - JWT refresh_token for session renewal
 * - Proper expiration timestamps for both tokens
 *
 * The newly registered member should be able to immediately use
 * member-only features without waiting for email verification.
 */
export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection for registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Register new member with valid credentials
  const registration = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // Validate registration response structure and types
  typia.assert(registration);
  // Verify member ID is present
  TestValidator.predicate("member ID exists", registration.id !== undefined);
  // Verify access token exists
  TestValidator.predicate(
    "access token exists",
    registration.token.access !== undefined,
  );
  // Verify refresh token exists
  TestValidator.predicate(
    "refresh token exists",
    registration.token.refresh !== undefined,
  );
  // Verify expiration timestamps exist
  TestValidator.predicate(
    "expired_at exists",
    registration.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refreshable_until exists",
    registration.token.refreshable_until !== undefined,
  );
  // Verify refresh token has longer validity than access token
  // (business logic: refresh tokens should expire after access tokens)
  const expiredAt = new Date(registration.token.expired_at).getTime();
  const refreshableUntil = new Date(
    registration.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "refresh token expires after access token",
    refreshableUntil > expiredAt,
  );
  // Verify member connection has been updated with authorization token
  TestValidator.predicate(
    "connection has authorization header",
    memberConnection.headers?.Authorization !== undefined,
  );
}
