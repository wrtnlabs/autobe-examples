import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test member registration with only required fields.
 *
 * Validates that the system accepts registration with minimal required fields
 * (username, email, password, href, referrer) and creates a valid account with
 * proper defaults. Confirms optional fields are set to null and default privacy
 * settings are applied correctly. Validates JWT tokens are issued for immediate
 * authentication.
 *
 * Steps:
 *
 * 1. Generate random data for required fields only
 * 2. Submit registration with minimal payload
 * 3. Validate successful account creation
 * 4. Verify JWT token issuance
 * 5. Confirm optional fields are null
 * 6. Validate default privacy settings
 * 7. Verify karma scores initialized to 0
 */
export async function test_api_member_registration_minimal_required_fields(
  connection: api.IConnection,
) {
  // Generate random required field data
  const username = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<50>
  >();
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.MinLength<8>>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Create registration request with only required fields
  const registrationData = {
    username: username,
    email: email,
    password: password,
    href: href,
    referrer: referrer,
  } satisfies IRedditCommunityGuest.ICreate;

  // Submit registration request
  const registeredMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  // Validate response structure - this validates ALL properties including nested ones
  typia.assert(registeredMember);

  // Verify basic account information
  TestValidator.equals("username matches", registeredMember.username, username);
  TestValidator.equals("email matches", registeredMember.email, email);

  // Verify email is not verified for new account
  TestValidator.equals(
    "email not verified",
    registeredMember.email_verified,
    false,
  );

  // Verify optional fields are null or undefined
  TestValidator.predicate(
    "display_name is null or undefined",
    registeredMember.display_name === null ||
      registeredMember.display_name === undefined,
  );
  TestValidator.predicate(
    "bio is null or undefined",
    registeredMember.bio === null || registeredMember.bio === undefined,
  );
  TestValidator.predicate(
    "avatar_url is null or undefined",
    registeredMember.avatar_url === null ||
      registeredMember.avatar_url === undefined,
  );

  // Verify default privacy settings
  TestValidator.equals(
    "show_online_status defaults to false",
    registeredMember.show_online_status,
    false,
  );
  TestValidator.equals(
    "show_subscribed_communities defaults to false",
    registeredMember.show_subscribed_communities,
    false,
  );
  TestValidator.equals(
    "show_activity_feed defaults to true",
    registeredMember.show_activity_feed,
    true,
  );

  // Verify karma scores initialized to 0
  TestValidator.equals(
    "post_karma initialized to 0",
    registeredMember.post_karma,
    0,
  );
  TestValidator.equals(
    "comment_karma initialized to 0",
    registeredMember.comment_karma,
    0,
  );

  // Verify JWT token presence and structure
  TestValidator.predicate(
    "access token exists",
    registeredMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    registeredMember.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at exists",
    registeredMember.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until exists",
    registeredMember.token.refreshable_until.length > 0,
  );

  // Verify timestamps are present
  TestValidator.predicate(
    "created_at exists",
    registeredMember.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    registeredMember.updated_at.length > 0,
  );

  // Verify member ID exists
  TestValidator.predicate("member id exists", registeredMember.id.length > 0);
}
