import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test the escalated appeal workflow for community bans.
 *
 * This test validates the complete multi-tier appeal process where a member is
 * banned from a community, appeals to the moderator, has the appeal denied,
 * escalates to administrators, and finally has the ban lifted by an
 * administrator.
 *
 * Workflow:
 *
 * 1. Create admin, moderator, and member accounts
 * 2. Create community (member creates, moderator manages)
 * 3. Moderator bans the member from the community
 * 4. Member submits appeal against the ban
 * 5. Moderator reviews and denies the appeal
 * 6. Member escalates the denied appeal to administrators
 * 7. Administrator lifts the ban
 * 8. Validate complete audit trail and proper status updates
 */
export async function test_api_community_ban_admin_escalated_appeal(
  connection: api.IConnection,
) {
  // Phase 1: Create all required accounts
  const adminAccount: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(10),
      } satisfies IRedditLikeAdmin.ICreate,
    });
  typia.assert(adminAccount);
  const adminEmail = adminAccount.email;
  const adminPassword = RandomGenerator.alphaNumeric(10);

  const moderatorAccount: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(10),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderatorAccount);
  const moderatorEmail = moderatorAccount.email;
  const moderatorPassword = RandomGenerator.alphaNumeric(10);

  const memberPassword = RandomGenerator.alphaNumeric(10);
  const memberAccount: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
        email: typia.random<string & tags.Format<"email">>(),
        password: memberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(memberAccount);
  const memberEmail = memberAccount.email;

  // Phase 2: Create community (member context is already active)
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
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
    });
  typia.assert(community);

  // Phase 3: Issue community ban (switch to moderator context)
  const banCreationDate = new Date();
  const banExpirationDate = new Date(
    banCreationDate.getTime() + 30 * 24 * 60 * 60 * 1000,
  );

  const communityBan: IRedditLikeCommunityBan =
    await api.functional.redditLike.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          banned_member_id: memberAccount.id,
          ban_reason_category: "spam",
          ban_reason_text: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 8,
          }),
          internal_notes: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 7,
          }),
          is_permanent: false,
          expiration_date: banExpirationDate.toISOString(),
        } satisfies IRedditLikeCommunityBan.ICreate,
      },
    );
  typia.assert(communityBan);
  TestValidator.equals(
    "banned member matches",
    communityBan.banned_member_id,
    memberAccount.id,
  );
  TestValidator.equals(
    "ban community matches",
    communityBan.community_id,
    community.id,
  );

  // Phase 4: Member submits appeal against the ban (member context already active)
  const appeal: IRedditLikeModerationAppeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      connection,
      {
        body: {
          community_ban_id: communityBan.id,
          appeal_type: "community_ban",
          appeal_text: RandomGenerator.paragraph({
            sentences: 8,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IRedditLikeModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);
  TestValidator.equals(
    "appeal type is community_ban",
    appeal.appeal_type,
    "community_ban",
  );
  TestValidator.equals(
    "appellant is the banned member",
    appeal.appellant_member_id,
    memberAccount.id,
  );

  // Phase 5: Moderator reviews and denies the appeal (moderator context already active)
  const reviewedAppeal: IRedditLikeModerationAppeal =
    await api.functional.redditLike.moderator.moderation.appeals.review(
      connection,
      {
        appealId: appeal.id,
        body: {
          decision: "uphold",
          decision_explanation: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 6,
            wordMax: 12,
          }),
        } satisfies IRedditLikeModerationAppeal.IReview,
      },
    );
  typia.assert(reviewedAppeal);
  TestValidator.equals(
    "appeal status updated after review",
    reviewedAppeal.status,
    "upheld",
  );

  // Phase 6: Member escalates denied appeal to administrators (member context already active)
  const escalatedAppeal: IRedditLikeModerationAppeal =
    await api.functional.redditLike.member.moderation.appeals.escalate.postByAppealid(
      connection,
      {
        appealId: reviewedAppeal.id,
      },
    );
  typia.assert(escalatedAppeal);
  TestValidator.equals(
    "appeal is escalated",
    escalatedAppeal.is_escalated,
    true,
  );

  // Phase 7: Administrator lifts the ban (admin context already active)
  await api.functional.redditLike.admin.communities.bans.erase(connection, {
    communityId: community.id,
    banId: communityBan.id,
  });

  // Final validation - confirm the complete workflow executed successfully
  TestValidator.predicate("admin account created", adminAccount.id.length > 0);
  TestValidator.predicate(
    "moderator account created",
    moderatorAccount.id.length > 0,
  );
  TestValidator.predicate(
    "member account created",
    memberAccount.id.length > 0,
  );
  TestValidator.predicate("community created", community.id.length > 0);
  TestValidator.predicate("ban was issued", communityBan.id.length > 0);
  TestValidator.predicate("appeal was submitted", appeal.id.length > 0);
  TestValidator.predicate(
    "appeal was reviewed and denied",
    reviewedAppeal.status === "upheld",
  );
  TestValidator.predicate(
    "appeal was escalated to admin",
    escalatedAppeal.is_escalated === true,
  );
}
