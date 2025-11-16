import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberProfile";

/**
 * Test geographic location field update with various location formats.
 *
 * This test validates that members can update their profile location field with
 * various text formats including city-state ('San Francisco, CA'), country
 * format ('Berlin, Germany'), and other text variations. Verifies that location
 * information is stored and retrieved correctly as context-only data without
 * geocoding or address validation requirements.
 *
 * Test workflow:
 *
 * 1. Create a new member account via registration endpoint
 * 2. Update member profile with city-state location format
 * 3. Update member profile with country location format
 * 4. Update member profile with alternative location format
 * 5. Update member profile with text-only location format
 * 6. Validate location field accepts various text formats without validation
 */
export async function test_api_member_profile_update_location_field(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const memberPassword = "SecurePassword123!@#";
  const memberHref = typia.random<string & tags.Format<"uri">>();
  const memberReferrer = typia.random<string & tags.Format<"uri">>();

  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword,
      href: memberHref,
      referrer: memberReferrer,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(authorizedMember);

  const memberId = authorizedMember.id;
  TestValidator.equals(
    "member created with valid ID",
    typeof memberId,
    "string",
  );

  // Step 2: Update member profile with city-state location format
  const citystateLocation = "San Francisco, CA";
  const updateResponse1 =
    await api.functional.communityPlatform.member.members.profiles.update(
      connection,
      {
        memberId: memberId,
        body: {
          location: citystateLocation,
        } satisfies ICommunityPlatformMemberProfile.IUpdate,
      },
    );
  typia.assert(updateResponse1);
  TestValidator.equals(
    "location updated to city-state format",
    updateResponse1.location,
    citystateLocation,
  );

  // Step 3: Update member profile with country location format
  const countryLocation = "Berlin, Germany";
  const updateResponse2 =
    await api.functional.communityPlatform.member.members.profiles.update(
      connection,
      {
        memberId: memberId,
        body: {
          location: countryLocation,
        } satisfies ICommunityPlatformMemberProfile.IUpdate,
      },
    );
  typia.assert(updateResponse2);
  TestValidator.equals(
    "location updated to country format",
    updateResponse2.location,
    countryLocation,
  );

  // Step 4: Update member profile with alternative location format
  const alternativeLocation = "New York, United States";
  const updateResponse3 =
    await api.functional.communityPlatform.member.members.profiles.update(
      connection,
      {
        memberId: memberId,
        body: {
          location: alternativeLocation,
        } satisfies ICommunityPlatformMemberProfile.IUpdate,
      },
    );
  typia.assert(updateResponse3);
  TestValidator.equals(
    "location updated to alternative format",
    updateResponse3.location,
    alternativeLocation,
  );

  // Step 5: Update member profile with text-only location format
  const textOnlyLocation = "Southeast Asia Region";
  const updateResponse4 =
    await api.functional.communityPlatform.member.members.profiles.update(
      connection,
      {
        memberId: memberId,
        body: {
          location: textOnlyLocation,
        } satisfies ICommunityPlatformMemberProfile.IUpdate,
      },
    );
  typia.assert(updateResponse4);
  TestValidator.equals(
    "location updated to text-only format",
    updateResponse4.location,
    textOnlyLocation,
  );

  // Step 6: Validate location field accepts various text formats without validation
  TestValidator.predicate(
    "location field is string type",
    typeof updateResponse4.location === "string",
  );
  TestValidator.predicate(
    "location field length is within bounds",
    updateResponse4.location!.length <= 100,
  );
}
