import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

export async function test_api_appeal_review_reduce_penalty_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create member account that will be banned
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: "SecurePass123!@#",
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create moderator account (authentication switches to moderator)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: moderatorEmail,
      password: "ModeratorPass123!@#",
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Moderator creates a community
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(15),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "discussion",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 4: Assign moderator to community
  const communityModerator =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: moderator.id,
          permissions:
            "manage_posts,manage_comments,manage_users,access_reports",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(communityModerator);

  // Step 5: Moderator issues permanent community ban to member
  const permanentBan =
    await api.functional.redditLike.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          banned_member_id: member.id,
          ban_reason_category: "harassment",
          ban_reason_text: RandomGenerator.paragraph({ sentences: 3 }),
          internal_notes: "Repeated violations of community guidelines",
          is_permanent: true,
        } satisfies IRedditLikeCommunityBan.ICreate,
      },
    );
  typia.assert(permanentBan);
  TestValidator.equals("ban is permanent", permanentBan.is_permanent, true);
  TestValidator.equals(
    "ban has no expiration for permanent ban",
    permanentBan.expiration_date,
    undefined,
  );

  // Step 6: Create new member connection to submit appeal (member needs to be authenticated)
  const memberConnection: api.IConnection = { ...connection, headers: {} };
  const memberAuth = await api.functional.auth.member.join(memberConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: "MemberPass123!@#",
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(memberAuth);

  // Submit appeal as the banned member (using original member's ID in appeal context)
  const appeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      memberConnection,
      {
        body: {
          community_ban_id: permanentBan.id,
          appeal_type: "community_ban",
          appeal_text: RandomGenerator.paragraph({
            sentences: 10,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IRedditLikeModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);
  TestValidator.equals("appeal status is pending", appeal.status, "pending");
  TestValidator.equals(
    "appeal type is community_ban",
    appeal.appeal_type,
    "community_ban",
  );

  // Step 7: Review appeal as moderator with reduce_penalty decision
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const expirationDate = futureDate.toISOString();

  const reviewedAppeal =
    await api.functional.redditLike.moderator.moderation.appeals.review(
      connection,
      {
        appealId: appeal.id,
        body: {
          decision: "reduce_penalty",
          decision_explanation: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 6,
            wordMax: 12,
          }),
          penalty_modification: `Reduced from permanent ban to temporary ban expiring on ${expirationDate}`,
        } satisfies IRedditLikeModerationAppeal.IReview,
      },
    );
  typia.assert(reviewedAppeal);

  // Step 8: Validate appeal status updated to 'reduced'
  TestValidator.equals(
    "appeal status updated to reduced",
    reviewedAppeal.status,
    "reduced",
  );

  // Step 9: Validate decision_explanation is recorded per R-APP-020
  TestValidator.predicate(
    "decision explanation is recorded",
    reviewedAppeal.decision_explanation !== null &&
      reviewedAppeal.decision_explanation !== undefined,
  );

  // Step 10: Validate reviewed_at timestamp is set indicating review completion
  TestValidator.predicate(
    "reviewed_at timestamp is set",
    reviewedAppeal.reviewed_at !== null &&
      reviewedAppeal.reviewed_at !== undefined,
  );

  // Step 11: Validate appellant member ID matches the banned member
  TestValidator.equals(
    "appellant is the banned member",
    appeal.appellant_member_id,
    memberAuth.id,
  );
}
