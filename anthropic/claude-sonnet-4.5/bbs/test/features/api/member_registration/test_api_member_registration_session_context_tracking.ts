import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member registration with session context tracking.
 *
 * This test validates that member registration properly captures and stores
 * session context information including href (current page URL) and referrer
 * (previous page URL). It verifies that these session context fields are
 * correctly accepted by the API and can be used for tracking user acquisition
 * sources, registration location analytics, and security monitoring.
 *
 * The test covers two scenarios:
 *
 * 1. Registration with full session context (href and referrer populated)
 * 2. Registration with empty referrer to simulate direct access
 *
 * Steps:
 *
 * 1. Generate realistic test data for member registration
 * 2. Register a member with full session context (href and referrer)
 * 3. Validate successful registration and authentication token issuance
 * 4. Register another member with empty referrer (direct access scenario)
 * 5. Verify both registrations succeed and return proper authentication data
 */
export async function test_api_member_registration_session_context_tracking(
  connection: api.IConnection,
) {
  // Step 1: Register member with full session context
  const email1 = typia.random<string & tags.Format<"email">>();
  const password1 = RandomGenerator.alphaNumeric(12);
  const username1 = RandomGenerator.name(1);
  const href1 = "https://example.com/register";
  const referrer1 = "https://example.com/home";

  const registrationData1 = {
    email: email1,
    password: password1,
    username: username1,
    href: href1,
    referrer: referrer1,
  } satisfies IDiscussionBoardMember.ICreate;

  const member1 = await api.functional.auth.member.join(connection, {
    body: registrationData1,
  });

  typia.assert(member1);

  // Step 2: Validate first registration response
  TestValidator.equals("member1 email matches", member1.email, email1);
  TestValidator.equals("member1 username matches", member1.username, username1);

  // Step 3: Register member with empty referrer (direct access scenario)
  const email2 = typia.random<string & tags.Format<"email">>();
  const password2 = RandomGenerator.alphaNumeric(12);
  const username2 = RandomGenerator.name(1);
  const href2 = "https://example.com/signup";
  const referrer2 = "";

  const registrationData2 = {
    email: email2,
    password: password2,
    username: username2,
    href: href2,
    referrer: referrer2,
  } satisfies IDiscussionBoardMember.ICreate;

  const member2 = await api.functional.auth.member.join(connection, {
    body: registrationData2,
  });

  typia.assert(member2);

  // Step 4: Validate second registration response with empty referrer
  TestValidator.equals("member2 email matches", member2.email, email2);
  TestValidator.equals("member2 username matches", member2.username, username2);

  // Step 5: Verify both members have different IDs
  TestValidator.notEquals("members have different IDs", member1.id, member2.id);
  TestValidator.notEquals(
    "members have different emails",
    member1.email,
    member2.email,
  );
}
