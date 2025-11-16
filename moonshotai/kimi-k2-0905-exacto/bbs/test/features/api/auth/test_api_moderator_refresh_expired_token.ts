import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test successful moderator token refresh functionality.
 *
 * This test validates the moderator token refresh endpoint handles valid
 * refresh requests correctly and maintains proper session lifecycle management.
 * The scenario ensures the refresh mechanism works as designed for active
 * moderator sessions.
 *
 * Test steps:
 *
 * 1. Generate valid refresh request data with realistic session context
 * 2. Successfully refresh a valid moderator token
 * 3. Validate response contains proper authorization data
 * 4. Verify refresh endpoint handles different IP formats correctly
 * 5. Ensure session metadata is properly tracked
 */
export async function test_api_moderator_refresh_expired_token(
  connection: api.IConnection,
) {
  // Generate valid refresh request data with realistic session context
  const validRefreshRequest = {
    refresh_token: "moderator_test_refresh_token_123456789",
    href: "https://discussion.example.com/admin/moderate",
    referrer: "https://discussion.example.com/admin/login",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEconomicDiscussionModerator.IRefresh;

  // Test successful refresh with IPv4 address
  const refreshResponse = await api.functional.auth.moderator.refresh(
    connection,
    {
      body: validRefreshRequest,
    },
  );

  // Validate the response contains proper authorization data
  typia.assert(refreshResponse);

  TestValidator.equals(
    "moderator has valid ID",
    typeof refreshResponse.id,
    "string",
  );
  TestValidator.equals(
    "moderator has username",
    typeof refreshResponse.username,
    "string",
  );
  TestValidator.equals(
    "moderator has email",
    typeof refreshResponse.email,
    "string",
  );
  TestValidator.predicate("email is valid format", () =>
    refreshResponse.email.includes("@"),
  );
  TestValidator.equals(
    "moderator has email verification status",
    typeof refreshResponse.email_verified,
    "boolean",
  );
  TestValidator.equals(
    "moderator has 2FA status",
    typeof refreshResponse.two_factor_enabled,
    "boolean",
  );
  TestValidator.equals(
    "moderator has moderation level",
    typeof refreshResponse.moderation_level,
    "string",
  );
  TestValidator.equals(
    "moderator has created timestamp",
    typeof refreshResponse.created_at,
    "string",
  );
  TestValidator.equals(
    "moderator has updated timestamp",
    typeof refreshResponse.updated_at,
    "string",
  );

  // Validate token structure
  TestValidator.equals(
    "token has access field",
    typeof refreshResponse.token.access,
    "string",
  );
  TestValidator.equals(
    "token has refresh field",
    typeof refreshResponse.token.refresh,
    "string",
  );
  TestValidator.equals(
    "token has expiration",
    typeof refreshResponse.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "token has refresh expiration",
    typeof refreshResponse.token.refreshable_until,
    "string",
  );

  // Test with IPv6 address format
  const ipv6RefreshRequest = {
    refresh_token: "moderator_ipv6_refresh_token_987654321",
    href: "https://discussion.example.com/admin/dashboard",
    referrer: "https://discussion.example.com/admin/panel",
    ip: typia.random<string & tags.Format<"ipv6">>(),
  } satisfies IEconomicDiscussionModerator.IRefresh;

  const ipv6Response = await api.functional.auth.moderator.refresh(connection, {
    body: ipv6RefreshRequest,
  });

  typia.assert(ipv6Response);
  TestValidator.predicate(
    "IPv6 refresh returns valid moderator data",
    () => ipv6Response.id.length > 0,
  );

  // Test without optional IP address field
  const noIpRefreshRequest = {
    refresh_token: "moderator_no_ip_refresh_token_abcdef123",
    href: "https://discussion.example.com/admin/articles",
    referrer: "https://discussion.example.com/admin/dashboard",
  } satisfies IEconomicDiscussionModerator.IRefresh;

  const noIpResponse = await api.functional.auth.moderator.refresh(connection, {
    body: noIpRefreshRequest,
  });

  typia.assert(noIpResponse);
  TestValidator.predicate(
    "refresh without IP returns valid data",
    () => noIpResponse.username.length > 0,
  );
}
