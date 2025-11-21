import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that members can retrieve their own profile information after community
 * creation. Validates self-service profile access where member creates account,
 * creates a community, and then retrieves their own information. Ensures
 * complete profile data including karma score, verification status, and
 * activity history is accessible to the account owner.
 */
export async function test_api_member_profile_self_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123"; // 13 characters - meets 8 char minimum requirement

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        ip: "192.168.1.1",
        href: "https://community-platform.example.com/register",
        referrer: "https://community-platform.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create community to establish member relationships required for retrieval
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public", // Using string literal that matches DTO expectations
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Retrieve member's own profile information
  const profile: ICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.member.members.at(connection, {
      memberId: member.id,
    });
  typia.assert(profile);

  // Step 4: Validate profile data matches the authenticated member
  TestValidator.equals("member ID matches", profile.id, member.id);
  TestValidator.equals("email matches", profile.email, member.email);
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    member.display_name,
  );
  TestValidator.equals(
    "karma score is zero for new member",
    profile.karma_score,
    0,
  );
  TestValidator.equals(
    "new member is not verified",
    profile.is_verified,
    false,
  );
  TestValidator.predicate(
    "last active timestamp exists",
    profile.last_active_at !== null && profile.last_active_at !== undefined,
  );
  TestValidator.predicate(
    "created at timestamp exists",
    profile.created_at !== null && profile.created_at !== undefined,
  );
}
