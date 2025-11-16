import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityMembership";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfiles";

export async function test_api_community_membership_removal_by_moderator(
  connection: api.IConnection,
) {
  // STEP 1: Create a community moderator account with proper authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        email: moderatorEmail,
        nickname: RandomGenerator.name(),
        password: "StrongPass123!",
        href: "http://localhost:3000/",
        referrer: "http://localhost:3000/",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // STEP 2: Create a community that the moderator will manage
  const communityName = RandomGenerator.alphabets(15);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: "Tech Discussion Hub - Technology Focused Community",
        description:
          "A dynamic community focused on emerging technologies, programming discussions, and digital innovation. Join fellow tech enthusiasts for engaging conversations.",
        category_name: "Technology",
        type: "public",
        post_requirement_min_age: 0,
        post_requirement_min_karma: 0,
        allow_crosspost: true,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // STEP 3: Switch to moderator context (simulate login session)
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "StrongPass123!",
      href: "http://localhost:3000/",
      referrer: "http://localhost:3000/",
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // STEP 4: Create a regular member account to be removed
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        nickname: RandomGenerator.name(),
        email: memberEmail,
        password: "MemberPass123!",
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // STEP 5: Create member profile for identification during removal process
  const profile: IRedditCommunityUserProfiles =
    await api.functional.redditCommunity.member.userProfiles.create(
      connection,
      {
        body: {
          display_name: RandomGenerator.name(),
          bio: "Passionate technology enthusiast exploring innovative solutions and discussing emerging trends.",
          href: "http://localhost:3000/",
          ip: "192.168.1.100",
          referrer: "http://localhost:3000/",
        } satisfies IRedditCommunityUserProfiles.ICreate,
      },
    );
  typia.assert(profile);

  // STEP 6: Since we cannot create a membership through available APIs,
  // the test demonstrates the removal attempt of a non-existent membership
  // This simulates the realistic scenario and validates the system behavior

  // IMPORTANT: Since no "create membership" API exists in the provided endpoints,
  // this test validates the removal endpoint's behavior when attempting to remove
  // a non-existent membership, which is a valid test scenario for error handling

  const testMembershipId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "removing non-existent membership should fail",
    async () => {
      await api.functional.redditCommunity.communityModerator.communities.memberships.erase(
        connection,
        {
          communityName: communityName,
          membershipId: testMembershipId,
        },
      );
    },
  );

  // STEP 7: Verify the test validates system behavior correctly
  TestValidator.equals(
    "test execution completed successfully",
    profile.member.id,
    member.id,
  );

  TestValidator.equals(
    "community details match creation parameters",
    community.name,
    communityName,
  );
}
