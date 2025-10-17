import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test the complete workflow of a member submitting an appeal after being
 * banned from a community.
 *
 * This test validates the appeal submission system by creating a member,
 * moderator, and community, issuing a community ban, and then testing the
 * appeal submission process. It ensures that:
 *
 * - Members can successfully submit appeals for community bans
 * - Appeals contain all required fields with proper validation
 * - The appeal status is correctly set to 'pending'
 * - The system prevents duplicate appeals for the same ban
 * - Appeals are properly associated with the community ban
 *
 * Workflow:
 *
 * 1. Create member account (will be banned)
 * 2. Create moderator account (will issue ban)
 * 3. Member creates a test community
 * 4. Moderator issues community ban against the member
 * 5. Member submits appeal for the ban
 * 6. Validate appeal properties and business rules
 * 7. Test duplicate appeal prevention
 */
export async function test_api_appeal_submission_for_community_ban(
  connection: api.IConnection,
) {
  // Step 1: Create member account that will be banned
  const memberConnection: api.IConnection = { ...connection, headers: {} };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member = await api.functional.auth.member.join(memberConnection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create moderator account
  const moderatorConnection: api.IConnection = { ...connection, headers: {} };
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();

  const moderator = await api.functional.auth.moderator.join(
    moderatorConnection,
    {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IRedditLikeModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 3: As member, create a community for testing
  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();

  const community = await api.functional.redditLike.member.communities.create(
    memberConnection,
    {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "general",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 4: As moderator, issue community ban against the member
  const banReasonCategory = RandomGenerator.pick([
    "spam",
    "harassment",
    "rule_violation",
    "inappropriate_content",
  ] as const);
  const banReasonText = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 5,
    wordMax: 10,
  });
  const banDuration = new Date();
  banDuration.setDate(banDuration.getDate() + 7);

  const communityBan =
    await api.functional.redditLike.moderator.communities.bans.create(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          banned_member_id: member.id,
          ban_reason_category: banReasonCategory,
          ban_reason_text: banReasonText,
          internal_notes: RandomGenerator.paragraph({ sentences: 3 }),
          is_permanent: false,
          expiration_date: banDuration.toISOString(),
        } satisfies IRedditLikeCommunityBan.ICreate,
      },
    );
  typia.assert(communityBan);

  // Validate ban was created correctly
  TestValidator.equals(
    "ban targets correct member",
    communityBan.banned_member_id,
    member.id,
  );
  TestValidator.equals(
    "ban is for correct community",
    communityBan.community_id,
    community.id,
  );
  TestValidator.equals("ban is active", communityBan.is_active, true);

  // Step 5: As banned member, submit appeal for the ban
  const appealText = RandomGenerator.paragraph({
    sentences: 15,
    wordMin: 5,
    wordMax: 10,
  });

  const appeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      memberConnection,
      {
        body: {
          community_ban_id: communityBan.id,
          appeal_type: "community_ban",
          appeal_text: appealText,
        } satisfies IRedditLikeModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // Step 6: Validate appeal properties
  TestValidator.equals(
    "appeal is for community ban",
    appeal.appeal_type,
    "community_ban",
  );
  TestValidator.equals(
    "appeal is from correct member",
    appeal.appellant_member_id,
    member.id,
  );
  TestValidator.equals("appeal status is pending", appeal.status, "pending");
  TestValidator.predicate(
    "appeal text meets minimum length",
    appeal.appeal_text.length >= 50,
  );
  TestValidator.predicate(
    "appeal text meets maximum length",
    appeal.appeal_text.length <= 1000,
  );
  TestValidator.equals(
    "appeal is not escalated initially",
    appeal.is_escalated,
    false,
  );
  TestValidator.predicate(
    "expected resolution time is set",
    appeal.expected_resolution_at !== null &&
      appeal.expected_resolution_at !== undefined,
  );

  // Step 7: Test duplicate appeal prevention
  await TestValidator.error(
    "duplicate appeal for same ban should fail",
    async () => {
      await api.functional.redditLike.member.moderation.appeals.create(
        memberConnection,
        {
          body: {
            community_ban_id: communityBan.id,
            appeal_type: "community_ban",
            appeal_text: RandomGenerator.paragraph({
              sentences: 15,
              wordMin: 5,
              wordMax: 10,
            }),
          } satisfies IRedditLikeModerationAppeal.ICreate,
        },
      );
    },
  );
}
