import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test the guest session creation process of the redditCommunity platform.
 *
 * This test simulates registering a guest session by sending a request with
 * session_id, ip_address, and optional user_agent data. It verifies that a new
 * guest session user account is created, that the response includes all proper
 * fields such as uuid, timestamps, and JWT tokens, and that the values match
 * the sent data where applicable.
 *
 * The test validates token issuance allowing limited access without full user
 * credentials.
 */
export async function test_api_guest_join_create_session(
  connection: api.IConnection,
) {
  // Prepare a realistic guest registration data according to specifications
  const requestBody = {
    session_id: typia.random<string & tags.Format<"uuid">>(),
    ip_address: "192.168.1.1",
    user_agent: null,
  } satisfies IRedditCommunityGuest.ICreate;

  // Call the API function to create a guest session
  const response: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.guest.join.joinGuest(connection, {
      body: requestBody,
    });
  typia.assert(response);

  // Checks on returned guest session data
  TestValidator.predicate(
    "ID has length",
    typeof response.id === "string" && response.id.length > 0,
  );
  TestValidator.equals(
    "Session ID matches",
    response.session_id,
    requestBody.session_id,
  );
  TestValidator.equals(
    "IP address matches",
    response.ip_address,
    requestBody.ip_address,
  );
  TestValidator.equals("User agent is null", response.user_agent, null);

  // Validate timestamp formats
  TestValidator.predicate(
    "created_at is ISO string",
    typeof response.created_at === "string" && response.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof response.updated_at === "string" && response.updated_at.length > 0,
  );

  // Validate token structure and contents
  const token = response.token;
  TestValidator.predicate(
    "Token access is string and not empty",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "Token refresh is string and not empty",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "Token expired_at is string and not empty",
    typeof token.expired_at === "string" && token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "Token refreshable_until is string and not empty",
    typeof token.refreshable_until === "string" &&
      token.refreshable_until.length > 0,
  );
}
