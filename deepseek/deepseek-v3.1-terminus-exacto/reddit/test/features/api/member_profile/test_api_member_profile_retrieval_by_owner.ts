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
 * Test that authenticated members can retrieve their own profile information.
 * This scenario validates the complete profile retrieval workflow including
 * member authentication, profile access authorization, and proper data
 * structure validation. The test ensures that only the profile owner can access
 * their own profile details and that all profile fields are correctly populated
 * and returned.
 */
export async function test_api_member_profile_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. Create new member account and establish authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Create member entity which automatically creates the associated profile
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

  // 3. Retrieve the member's own profile information
  const profile = await api.functional.communityPlatform.members.profiles.at(
    connection,
    {
      memberId: member.id,
    },
  );
  typia.assert(profile);

  // 4. Validate that the profile contains the correct member reference
  TestValidator.equals(
    "profile member ID matches authenticated member ID",
    profile.member.id,
    member.id,
  );

  // 5. Validate profile structure and data integrity
  TestValidator.equals(
    "profile member email matches authenticated member email",
    profile.member.email,
    member.email,
  );

  TestValidator.equals(
    "profile member display name matches authenticated member display name",
    profile.member.display_name,
    member.display_name,
  );

  // 6. Validate that profile timestamps are properly set
  TestValidator.predicate(
    "profile created_at timestamp is valid ISO date",
    () => {
      const date = new Date(profile.created_at);
      return !isNaN(date.getTime());
    },
  );

  TestValidator.predicate(
    "profile updated_at timestamp is valid ISO date",
    () => {
      const date = new Date(profile.updated_at);
      return !isNaN(date.getTime());
    },
  );

  // 7. Validate optional profile fields structure
  TestValidator.predicate(
    "profile bio field is either undefined or string",
    () => profile.bio === undefined || typeof profile.bio === "string",
  );

  TestValidator.predicate(
    "profile avatar_url field is either undefined or valid URI",
    () => {
      if (profile.avatar_url === undefined) return true;
      try {
        new URL(profile.avatar_url);
        return true;
      } catch {
        return false;
      }
    },
  );

  TestValidator.predicate(
    "profile location field is either undefined or string",
    () =>
      profile.location === undefined || typeof profile.location === "string",
  );

  TestValidator.predicate(
    "profile website field is either undefined or valid URI",
    () => {
      if (profile.website === undefined) return true;
      try {
        new URL(profile.website);
        return true;
      } catch {
        return false;
      }
    },
  );
}
