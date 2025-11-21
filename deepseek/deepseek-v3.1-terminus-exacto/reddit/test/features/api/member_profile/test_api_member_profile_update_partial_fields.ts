import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

/**
 * Validates partial profile update functionality for community platform
 * members. Tests individual field updates (biography, avatar URL, location,
 * website) independently without requiring complete profile resubmission.
 * Verifies that specific fields are updated correctly while other fields remain
 * unchanged.
 */
export async function test_api_member_profile_update_partial_fields(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Establish community prerequisite
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Test biography-only update
  const bioUpdate =
    await api.functional.communityPlatform.member.members.profiles.update(
      connection,
      {
        memberId: member.id,
        body: {
          bio: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies ICommunityPlatformUserProfile.IUpdate,
      },
    );
  typia.assert(bioUpdate);
  TestValidator.notEquals(
    "biography should be updated",
    bioUpdate.bio,
    undefined,
  );

  // Step 4: Test avatar URL-only update
  const avatarUpdate =
    await api.functional.communityPlatform.member.members.profiles.update(
      connection,
      {
        memberId: member.id,
        body: {
          avatar_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformUserProfile.IUpdate,
      },
    );
  typia.assert(avatarUpdate);
  TestValidator.notEquals(
    "avatar URL should be updated",
    avatarUpdate.avatar_url,
    undefined,
  );
  TestValidator.equals(
    "biography should remain unchanged",
    avatarUpdate.bio,
    bioUpdate.bio,
  );

  // Step 5: Test location-only update
  const locationUpdate =
    await api.functional.communityPlatform.member.members.profiles.update(
      connection,
      {
        memberId: member.id,
        body: {
          location: RandomGenerator.name(),
        } satisfies ICommunityPlatformUserProfile.IUpdate,
      },
    );
  typia.assert(locationUpdate);
  TestValidator.notEquals(
    "location should be updated",
    locationUpdate.location,
    undefined,
  );
  TestValidator.equals(
    "avatar URL should remain unchanged",
    locationUpdate.avatar_url,
    avatarUpdate.avatar_url,
  );
  TestValidator.equals(
    "biography should remain unchanged",
    locationUpdate.bio,
    bioUpdate.bio,
  );

  // Step 6: Test website-only update
  const websiteUpdate =
    await api.functional.communityPlatform.member.members.profiles.update(
      connection,
      {
        memberId: member.id,
        body: {
          website: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformUserProfile.IUpdate,
      },
    );
  typia.assert(websiteUpdate);
  TestValidator.notEquals(
    "website should be updated",
    websiteUpdate.website,
    undefined,
  );
  TestValidator.equals(
    "location should remain unchanged",
    websiteUpdate.location,
    locationUpdate.location,
  );
  TestValidator.equals(
    "avatar URL should remain unchanged",
    websiteUpdate.avatar_url,
    avatarUpdate.avatar_url,
  );
  TestValidator.equals(
    "biography should remain unchanged",
    websiteUpdate.bio,
    bioUpdate.bio,
  );

  // Final validation: Retrieve full profile to confirm all updates persisted
  const finalProfile =
    await api.functional.communityPlatform.member.members.profiles.update(
      connection,
      {
        memberId: member.id,
        body: {} satisfies ICommunityPlatformUserProfile.IUpdate,
      },
    );
  typia.assert(finalProfile);
  TestValidator.equals(
    "final biography matches last update",
    finalProfile.bio,
    bioUpdate.bio,
  );
  TestValidator.equals(
    "final avatar URL matches last update",
    finalProfile.avatar_url,
    avatarUpdate.avatar_url,
  );
  TestValidator.equals(
    "final location matches last update",
    finalProfile.location,
    locationUpdate.location,
  );
  TestValidator.equals(
    "final website matches last update",
    finalProfile.website,
    websiteUpdate.website,
  );
}
