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

export async function test_api_appeal_escalation_after_community_ban(
  connection: api.IConnection,
) {
  // Step 1: Create member account that will be banned and submit appeal
  const bannedMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username:
          RandomGenerator.alphabets(3) + RandomGenerator.alphaNumeric(5),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(10),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(bannedMember);

  // Step 2: Create community where ban will be issued
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 8,
        }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "discussion",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create moderator account in a separate workflow
  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username:
          RandomGenerator.alphabets(3) + RandomGenerator.alphaNumeric(5),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(10),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 4: Assign moderator to community
  const moderatorAssignment: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: moderator.id,
          permissions: "manage_posts,manage_comments,manage_users",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // Step 5: Issue community ban against the member
  const ban: IRedditLikeCommunityBan =
    await api.functional.redditLike.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          banned_member_id: bannedMember.id,
          ban_reason_category: "spam",
          ban_reason_text: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          is_permanent: false,
          expiration_date: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IRedditLikeCommunityBan.ICreate,
      },
    );
  typia.assert(ban);

  // Step 6: Submit appeal challenging the community ban
  const appeal: IRedditLikeModerationAppeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      connection,
      {
        body: {
          community_ban_id: ban.id,
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

  // Verify initial appeal state
  TestValidator.equals(
    "appeal type is community_ban",
    appeal.appeal_type,
    "community_ban",
  );
  TestValidator.equals(
    "appeal not escalated initially",
    appeal.is_escalated,
    false,
  );

  // Step 7: Review and deny the appeal at community moderator level
  const reviewedAppeal: IRedditLikeModerationAppeal =
    await api.functional.redditLike.moderator.moderation.appeals.review(
      connection,
      {
        appealId: appeal.id,
        body: {
          decision: "uphold",
          decision_explanation: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IRedditLikeModerationAppeal.IReview,
      },
    );
  typia.assert(reviewedAppeal);

  // Step 8: Escalate the denied ban appeal to administrators
  const escalatedAppeal: IRedditLikeModerationAppeal =
    await api.functional.redditLike.member.moderation.appeals.escalate.putByAppealid(
      connection,
      {
        appealId: appeal.id,
      },
    );
  typia.assert(escalatedAppeal);

  // Validate escalation results
  TestValidator.equals(
    "appeal successfully escalated",
    escalatedAppeal.is_escalated,
    true,
  );
  TestValidator.equals("appeal ID preserved", escalatedAppeal.id, appeal.id);
  TestValidator.equals(
    "appeal type preserved",
    escalatedAppeal.appeal_type,
    "community_ban",
  );
  TestValidator.equals(
    "appellant member ID preserved",
    escalatedAppeal.appellant_member_id,
    bannedMember.id,
  );
}
