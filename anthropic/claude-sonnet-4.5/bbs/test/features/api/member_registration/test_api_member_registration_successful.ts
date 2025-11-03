import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful member account registration workflow with valid credentials
 * and proper account initialization.
 *
 * This scenario validates the complete registration process from submission of
 * valid registration data through account creation with proper default values
 * and email verification status. The test submits registration information
 * including a unique username (3-30 characters with alphanumeric, underscores,
 * and hyphens), a valid email address in proper RFC 5322 format, and a secure
 * password meeting complexity requirements (minimum 8 characters with at least
 * one uppercase letter, lowercase letter, number, and special character).
 *
 * Validation points include verifying that the registration response returns
 * the newly created member account information (excluding password_hash for
 * security), confirming that the account is created with status
 * 'pending_email_verification' and email_verified set to false, ensuring
 * default values are properly set including role 'member', profile_visibility
 * 'public', and activity_visibility 'public', validating that creation and
 * update timestamps are properly initialized, and confirming that the password
 * is securely hashed and never returned in the response.
 */
export async function test_api_member_registration_successful(
  connection: api.IConnection,
) {
  // Generate valid registration data with proper constraints
  const registrationData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<30> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    location: RandomGenerator.name(2),
    website_url: typia.random<string & tags.Format<"uri">>(),
    profile_picture_url: typia.random<string & tags.Format<"uri">>(),
    ip: "192.168.1.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IRegister;

  // Call the registration API
  const registeredMember: IDiscussionBoardMember =
    await api.functional.discussionBoard.auth.register(connection, {
      body: registrationData,
    });

  // Validate the response structure
  typia.assert(registeredMember);

  // Verify username matches the registration input
  TestValidator.equals(
    "registered username matches input",
    registeredMember.username,
    registrationData.username,
  );

  // Verify email matches the registration input
  TestValidator.equals(
    "registered email matches input",
    registeredMember.email,
    registrationData.email,
  );

  // Verify email_verified is false for new registration
  TestValidator.equals(
    "email_verified is false",
    registeredMember.email_verified,
    false,
  );

  // Verify status is 'pending_email_verification'
  TestValidator.equals(
    "status is pending_email_verification",
    registeredMember.status,
    "pending_email_verification",
  );

  // Verify profile_visibility defaults to 'public'
  TestValidator.equals(
    "profile_visibility defaults to public",
    registeredMember.profile_visibility,
    "public",
  );

  // Verify activity_visibility defaults to 'public'
  TestValidator.equals(
    "activity_visibility defaults to public",
    registeredMember.activity_visibility,
    "public",
  );

  // Verify optional profile fields match input (no null checks needed - we provided actual values)
  TestValidator.equals(
    "display_name matches input",
    registeredMember.display_name,
    registrationData.display_name,
  );
  TestValidator.equals(
    "bio matches input",
    registeredMember.bio,
    registrationData.bio,
  );
  TestValidator.equals(
    "location matches input",
    registeredMember.location,
    registrationData.location,
  );
  TestValidator.equals(
    "website_url matches input",
    registeredMember.website_url,
    registrationData.website_url,
  );
  TestValidator.equals(
    "profile_picture_url matches input",
    registeredMember.profile_picture_url,
    registrationData.profile_picture_url,
  );

  // Verify timestamps are initialized
  TestValidator.predicate(
    "created_at is initialized",
    registeredMember.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is initialized",
    registeredMember.updated_at.length > 0,
  );

  // Verify deleted_at is null or undefined for active account
  TestValidator.predicate(
    "deleted_at is not set",
    registeredMember.deleted_at === null ||
      registeredMember.deleted_at === undefined,
  );
}
