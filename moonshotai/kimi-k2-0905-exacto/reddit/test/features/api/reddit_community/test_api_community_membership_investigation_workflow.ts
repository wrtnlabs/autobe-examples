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

/**
 * Test the complete membership investigation workflow where moderators need to
 * examine specific member situations. Validates the ability to retrieve
 * comprehensive membership details for addressing member concerns,
 * investigating reports, or reviewing membership status changes. Tests that
 * detailed membership information provides sufficient context for making
 * informed decisions about role changes, administrative actions, or member
 * support interventions.
 *
 * This test follows a complete workflow starting with community moderator
 * authentication and then investigating membership details using the
 * specialized membership investigation endpoint. The test validates that
 * moderators can access all necessary membership information including member
 * profile data, community details, role assignments, activity history, and
 * administrative notes through the investigation API.
 */
export async function test_api_community_membership_investigation_workflow(
  connection: api.IConnection,
) {
  // Step 1: Register as community moderator to gain investigation privileges
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: "1234",
        nickname: RandomGenerator.name(),
        href: `https://reddit-community.example.com/auth/join`,
        referrer: `https://reddit-community.example.com/login`,
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 2: Investigate a membership using the investigation endpoint
  const membershipId = typia.random<string & tags.Format<"uuid">>();
  const communityName = RandomGenerator.alphabets(10);

  const investigatedMembership =
    await api.functional.redditCommunity.communityModerator.communities.memberships.at(
      connection,
      {
        communityName: communityName,
        membershipId: membershipId,
      },
    );
  typia.assert(investigatedMembership);

  // Step 3: Validate that the investigation provides comprehensive membership information
  TestValidator.equals(
    "membership investigation returns valid ID",
    investigatedMembership.id,
    membershipId,
  );
  TestValidator.equals(
    "membership investigation includes community name",
    investigatedMembership.reddit_community_community.name,
    communityName,
  );

  // Step 4: Verify complete member information is available for investigation
  TestValidator.predicate(
    "member has complete profile data",
    typeof investigatedMembership.reddit_community_member.id === "string" &&
      investigatedMembership.reddit_community_member.id.length > 0 &&
      investigatedMembership.reddit_community_member.email.length > 0 &&
      investigatedMembership.reddit_community_member.nickname.length > 0,
  );

  // Step 5: Validate role and membership details for investigation decisions
  TestValidator.predicate(
    "role assignment is present and valid",
    investigatedMembership.role.length > 0 &&
      (investigatedMembership.role === "member" ||
        investigatedMembership.role === "moderator" ||
        investigatedMembership.role === "banned" ||
        investigatedMembership.role === "suspended"),
  );

  // Step 6: Confirm temporal information is available for activity analysis
  TestValidator.predicate(
    "join date is properly tracked",
    investigatedMembership.joined_at.length > 0 &&
      new Date(investigatedMembership.joined_at).getTime() > 0,
  );

  // Step 7: Verify activity tracking information for investigation context
  if (
    investigatedMembership.last_activity_at !== null &&
    investigatedMembership.last_activity_at !== undefined
  ) {
    TestValidator.predicate(
      "last activity timestamp is valid",
      new Date(investigatedMembership.last_activity_at).getTime() > 0,
    );
  }

  // Step 8: Validate administrative notes are accessible for investigation
  TestValidator.predicate(
    "administrative notes accessible",
    investigatedMembership.membership_notes === null ||
      investigatedMembership.membership_notes === undefined ||
      typeof investigatedMembership.membership_notes === "string",
  );
}
