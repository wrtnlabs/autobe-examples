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
 * Comprehensive profile update workflow validation for community platform
 * members.
 *
 * This test validates the complete profile update functionality including:
 *
 * - Creation of authenticated member account
 * - Comprehensive updates to biography, avatar URL, location, and website fields
 * - Partial update support verification
 * - Timestamp behavior validation (updated_at changes, created_at unchanged)
 * - Member reference integrity confirmation
 */
export async function test_api_member_profile_update_complete(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123",
      display_name: RandomGenerator.name(),
      href: "https://community-platform.example.com/join",
      referrer: "https://community-platform.example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Perform comprehensive profile update with all optional fields
  const updateData = {
    bio: RandomGenerator.content({ paragraphs: 1 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    location: RandomGenerator.name(),
    website: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformUserProfile.IUpdate;

  const updatedProfile =
    await api.functional.communityPlatform.member.members.profiles.update(
      connection,
      {
        memberId: member.id,
        body: updateData,
      },
    );
  typia.assert(updatedProfile);

  // Step 3: Validate all updated fields
  TestValidator.equals(
    "bio should be updated",
    updatedProfile.bio,
    updateData.bio,
  );
  TestValidator.equals(
    "avatar_url should be updated",
    updatedProfile.avatar_url,
    updateData.avatar_url,
  );
  TestValidator.equals(
    "location should be updated",
    updatedProfile.location,
    updateData.location,
  );
  TestValidator.equals(
    "website should be updated",
    updatedProfile.website,
    updateData.website,
  );

  // Step 4: Verify member reference integrity
  TestValidator.equals(
    "member ID should remain unchanged",
    updatedProfile.member.id,
    member.id,
  );
  TestValidator.equals(
    "member email should remain unchanged",
    updatedProfile.member.email,
    member.email,
  );
  TestValidator.equals(
    "member display_name should remain unchanged",
    updatedProfile.member.display_name,
    member.display_name,
  );

  // Step 5: Test partial update functionality
  const partialUpdateData = {
    bio: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ICommunityPlatformUserProfile.IUpdate;

  const partiallyUpdatedProfile =
    await api.functional.communityPlatform.member.members.profiles.update(
      connection,
      {
        memberId: member.id,
        body: partialUpdateData,
      },
    );
  typia.assert(partiallyUpdatedProfile);

  // Validate partial update: bio should change, other fields should remain
  TestValidator.equals(
    "bio should be updated in partial update",
    partiallyUpdatedProfile.bio,
    partialUpdateData.bio,
  );
  TestValidator.equals(
    "avatar_url should remain unchanged in partial update",
    partiallyUpdatedProfile.avatar_url,
    updatedProfile.avatar_url,
  );
  TestValidator.equals(
    "location should remain unchanged in partial update",
    partiallyUpdatedProfile.location,
    updatedProfile.location,
  );
  TestValidator.equals(
    "website should remain unchanged in partial update",
    partiallyUpdatedProfile.website,
    updatedProfile.website,
  );

  // Step 6: Verify timestamp behavior
  TestValidator.notEquals(
    "updated_at should change after update",
    updatedProfile.updated_at,
    partiallyUpdatedProfile.updated_at,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedProfile.created_at,
    partiallyUpdatedProfile.created_at,
  );
}
