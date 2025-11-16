import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberProfile";

export async function test_api_member_profile_update_bio_max_length(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for bio boundary testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPass123!@#";
  const memberUsername = RandomGenerator.alphabets(10);

  const createdMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
        ip: "127.0.0.1",
        href: "http://localhost/register",
        referrer: "http://localhost/home",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(createdMember);

  // Step 2: Generate biography at maximum length (500 characters)
  // Create exactly 500 characters by repeating pattern
  const baseText =
    "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ";
  let maxLengthBio = "";
  while (maxLengthBio.length < 500) {
    maxLengthBio += baseText;
  }
  // Trim to exactly 500 characters
  const finalBio = maxLengthBio.substring(0, 500);

  TestValidator.predicate(
    "bio length is exactly 500 characters",
    finalBio.length === 500,
  );

  // Step 3: Update member profile with bio at maximum length
  const updatedProfile: ICommunityPlatformMemberProfile =
    await api.functional.communityPlatform.member.members.profiles.update(
      connection,
      {
        memberId: createdMember.id,
        body: {
          bio: finalBio,
        } satisfies ICommunityPlatformMemberProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);

  // Step 4: Validate that biography was properly stored at maximum length
  TestValidator.equals(
    "updated profile bio matches input",
    updatedProfile.bio,
    finalBio,
  );

  TestValidator.predicate(
    "bio length persisted at maximum 500 characters",
    updatedProfile.bio !== undefined && updatedProfile.bio.length === 500,
  );

  // Step 5: Verify member reference is correctly associated
  TestValidator.equals(
    "profile associated with correct member id",
    updatedProfile.member.id,
    createdMember.id,
  );

  TestValidator.equals(
    "profile member username matches created username",
    updatedProfile.member.username,
    memberUsername,
  );
}
