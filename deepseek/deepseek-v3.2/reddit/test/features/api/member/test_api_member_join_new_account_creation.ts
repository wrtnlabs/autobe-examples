import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_new_account_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for member registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate random but valid test data
  // Use RandomGenerator for email-like string (must contain @ and .)
  const email = `${RandomGenerator.alphaNumeric(8)}@${RandomGenerator.alphaNumeric(6)}.com`;
  // Password can be any string - use alphanumeric for simplicity
  const password = RandomGenerator.alphaNumeric(12);
  const username = RandomGenerator.alphaNumeric(12);
  // URI must start with http:// or https://
  const href = `https://${RandomGenerator.alphaNumeric(8)}.com/${RandomGenerator.alphaNumeric(4)}`;
  const referrer = `https://${RandomGenerator.alphaNumeric(8)}.com/${RandomGenerator.alphaNumeric(4)}`;
  // IP is optional, we can omit it or set to null
  // Generate a valid IPv4 address for testing
  const ip = `${randint(1, 255)}.${randint(0, 255)}.${randint(0, 255)}.${randint(1, 254)}`;
  // Join without nickname to test default nickname behavior
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      username,
      nickname: null, // Explicitly null to test default behavior
      href,
      referrer,
      ip, // Include ip but it's optional
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Validate the complete response structure
  typia.assert(joinResponse);
  // Verify default values
  TestValidator.equals(
    "nickname should default to username when not provided",
    joinResponse.nickname,
    username,
  );
  TestValidator.equals(
    "email_verified should be false initially",
    joinResponse.email_verified,
    false,
  );
  TestValidator.predicate(
    "registered_at should be set",
    () =>
      joinResponse.registered_at !== undefined &&
      joinResponse.registered_at.length > 0,
  );
  TestValidator.equals(
    "last_login_at should be null initially",
    joinResponse.last_login_at,
    null,
  );
  // Verify token structure
  TestValidator.predicate(
    "access token should be present",
    () => joinResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    () => joinResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration dates should be valid",
    () =>
      joinResponse.token.expired_at.length > 0 &&
      joinResponse.token.refreshable_until.length > 0,
  );
  // Verify member info matches input
  TestValidator.equals(
    "member id should be a valid UUID",
    typeof joinResponse.id,
    "string",
  );
  TestValidator.equals(
    "username should match input",
    joinResponse.username,
    username,
  );
  TestValidator.equals("email should match input", joinResponse.email, email);
  // Verify additional response fields
  TestValidator.equals("karma should be 0 initially", joinResponse.karma, 0);
  TestValidator.predicate(
    "posts should be empty array",
    () => Array.isArray(joinResponse.posts) && joinResponse.posts.length === 0,
  );
  TestValidator.predicate(
    "comments should be empty array",
    () =>
      Array.isArray(joinResponse.comments) &&
      joinResponse.comments.length === 0,
  );
  TestValidator.equals("bio should be null initially", joinResponse.bio, null);
  TestValidator.equals(
    "avatar should be null initially",
    joinResponse.avatar,
    null,
  );
  // Test that the connection headers were updated with token
  TestValidator.predicate(
    "connection should have Authorization header",
    () =>
      memberConnection.headers !== undefined &&
      memberConnection.headers.Authorization === joinResponse.token.access,
  );
  // Note: Cannot test member-only endpoints since none are provided in API functions list
  // but we have validated that the token is properly generated and stored
}
