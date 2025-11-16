import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that the logout-all operation returns the correct response format with
 * all required fields.
 *
 * This scenario validates the response structure by creating a member account,
 * invoking logout-all, and verifying that the response includes all expected
 * fields: member ID (UUID), logout timestamp (ISO 8601 date-time), and a
 * confirmation message. This ensures API contract compliance and enables client
 * applications to properly handle the logout response.
 */
export async function test_api_member_logout_all_response_format(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account to establish authenticated session
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: "SecurePassword123!",
    ip: "192.168.1.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const authorized: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authorized);

  // Step 2: Call logout-all endpoint with authenticated connection
  const logoutResponse: ICommunityPlatformMember.ILogoutResponse =
    await api.functional.communityPlatform.member.auth.member.sessions.logout_all.logoutAll(
      connection,
    );
  typia.assert(logoutResponse);

  // Step 3: Validate confirmation message is present and non-empty
  TestValidator.predicate(
    "message field is non-empty string",
    typeof logoutResponse.message === "string" &&
      logoutResponse.message.length > 0,
  );

  // Step 4: Verify logout_at timestamp represents a valid date
  const logoutDate = new Date(logoutResponse.logout_at);
  TestValidator.predicate(
    "logout_at timestamp is valid and parseable",
    !isNaN(logoutDate.getTime()),
  );

  // Step 5: Validate member ID in response matches the authenticated member
  TestValidator.equals(
    "logout response member id matches authenticated member",
    logoutResponse.id,
    authorized.id,
  );
}
