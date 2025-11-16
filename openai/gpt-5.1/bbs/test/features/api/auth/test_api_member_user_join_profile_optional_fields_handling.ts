import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

/**
 * Validate handling of optional profile fields when registering a discussion
 * board member user.
 *
 * Business goals:
 *
 * - Ensure that the public registration endpoint /auth/memberUser/join works when
 *   optional profile fields are omitted or explicitly set to null.
 * - Ensure that when optional fields are provided, they are echoed in the
 *   authorized payload (where applicable) so that client applications can rely
 *   on immediate profile state.
 * - Confirm that registrations create an active, non-deleted account eligible for
 *   authenticated access with a valid JWT token structure.
 *
 * Scenario breakdown
 *
 * 1. Register a member with only required fields: email, password, displayName,
 *    href, referrer.
 *
 *    - Do not set any of bio, location, ip.
 *    - Expect registration to succeed and return
 *         IDiscussionBoardMemberuser.IAuthorized.
 *    - Validate that:
 *
 *         - Email and display_name match the request.
 *         - Bio and location are either null or undefined according to optional
 *                   semantics.
 *         - Account_status is a non-empty string and closed_by_admin is false.
 *         - Token is a well-formed IAuthorizationToken (typia.assert on the object
 *                   validates it).
 * 2. Register another member providing non-null optional fields:
 *
 *    - Supply bio, location, and ip with realistic values.
 *    - Expect registration to succeed and return
 *         IDiscussionBoardMemberuser.IAuthorized.
 *    - Validate that:
 *
 *         - Email and display_name match the request.
 *         - Bio and location in the response are non-null and equal to the provided
 *                   values.
 * 3. Validate token usability assumptions at a high level:
 *
 *    - For both registrations, validate via typia.assert that the embedded token
 *         satisfies IAuthorizationToken, trusting typia for deep validation.
 *    - Do not call other APIs using the token (those endpoints are not part of this
 *         test).
 */
export async function test_api_member_user_join_profile_optional_fields_handling(
  connection: api.IConnection,
) {
  // 1. Register with only required fields (omit optional profile attributes)
  const emailRequiredOnly: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const hrefRequiredOnly: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrerRequiredOnly: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const displayNameRequiredOnly: string &
    tags.MinLength<1> &
    tags.MaxLength<64> = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<64>
  >();

  const requiredOnlyBody = {
    email: emailRequiredOnly,
    password: RandomGenerator.alphabets(12),
    displayName: displayNameRequiredOnly,
    href: hrefRequiredOnly,
    referrer: referrerRequiredOnly,
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const requiredOnlyAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: requiredOnlyBody,
    });

  // Validate structure via typia
  typia.assert<IDiscussionBoardMemberuser.IAuthorized>(requiredOnlyAuthorized);

  // Business-level validations for required-only registration
  TestValidator.equals(
    "email in authorized payload should match registration email (required-only)",
    requiredOnlyAuthorized.email,
    emailRequiredOnly,
  );
  TestValidator.equals(
    "display_name in authorized payload should match registration displayName (required-only)",
    requiredOnlyAuthorized.display_name,
    displayNameRequiredOnly,
  );

  // Optional profile fields should not have non-null unexpected content when omitted.
  TestValidator.predicate(
    "bio should be undefined or null when omitted at registration",
    requiredOnlyAuthorized.bio === undefined ||
      requiredOnlyAuthorized.bio === null,
  );
  TestValidator.predicate(
    "location should be undefined or null when omitted at registration",
    requiredOnlyAuthorized.location === undefined ||
      requiredOnlyAuthorized.location === null,
  );

  // Lifecycle fields basic business checks
  TestValidator.equals(
    "closed_by_admin should be false for newly registered member (required-only)",
    requiredOnlyAuthorized.closed_by_admin,
    false,
  );
  TestValidator.predicate(
    "account_status should be a non-empty string for newly registered member",
    typeof requiredOnlyAuthorized.account_status === "string" &&
      requiredOnlyAuthorized.account_status.length > 0,
  );

  // Validate token structure (typia already checks fields; predicate ensures non-empty access token)
  typia.assert<IAuthorizationToken>(requiredOnlyAuthorized.token);
  TestValidator.predicate(
    "access token for required-only registration should be a non-empty string",
    requiredOnlyAuthorized.token.access.length > 0,
  );

  // 2. Register with non-null optional profile fields provided
  const emailWithProfile: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const hrefWithProfile: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrerWithProfile: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const displayNameWithProfile: string &
    tags.MinLength<1> &
    tags.MaxLength<64> = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<64>
  >();

  const bioValue = RandomGenerator.paragraph({ sentences: 3 });
  const locationValue = RandomGenerator.paragraph({ sentences: 2 });
  const ipValue = "192.0.2.1"; // Example documentation IPv4 address

  const withProfileBody = {
    email: emailWithProfile,
    password: RandomGenerator.alphabets(14),
    displayName: displayNameWithProfile,
    bio: bioValue,
    location: locationValue,
    ip: ipValue,
    href: hrefWithProfile,
    referrer: referrerWithProfile,
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const withProfileAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: withProfileBody,
    });

  typia.assert<IDiscussionBoardMemberuser.IAuthorized>(withProfileAuthorized);

  // Business-level validations for registration with profile fields
  TestValidator.equals(
    "email in authorized payload should match registration email (with profile)",
    withProfileAuthorized.email,
    emailWithProfile,
  );
  TestValidator.equals(
    "display_name in authorized payload should match registration displayName (with profile)",
    withProfileAuthorized.display_name,
    displayNameWithProfile,
  );

  // Verify that provided bio and location are reflected in the authorized payload
  TestValidator.predicate(
    "bio in authorized payload should be non-null when provided",
    withProfileAuthorized.bio !== null &&
      withProfileAuthorized.bio !== undefined,
  );
  TestValidator.equals(
    "bio in authorized payload should match provided bio",
    withProfileAuthorized.bio!,
    bioValue,
  );

  TestValidator.predicate(
    "location in authorized payload should be non-null when provided",
    withProfileAuthorized.location !== null &&
      withProfileAuthorized.location !== undefined,
  );
  TestValidator.equals(
    "location in authorized payload should match provided location",
    withProfileAuthorized.location!,
    locationValue,
  );

  // Lifecycle and token checks for with-profile registration
  TestValidator.equals(
    "closed_by_admin should be false for newly registered member (with profile)",
    withProfileAuthorized.closed_by_admin,
    false,
  );
  TestValidator.predicate(
    "account_status should be a non-empty string for newly registered member (with profile)",
    typeof withProfileAuthorized.account_status === "string" &&
      withProfileAuthorized.account_status.length > 0,
  );

  typia.assert<IAuthorizationToken>(withProfileAuthorized.token);
  TestValidator.predicate(
    "access token for with-profile registration should be a non-empty string",
    withProfileAuthorized.token.access.length > 0,
  );
}
