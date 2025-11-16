import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator workflow for recording member ban appeals including submission
 * timestamp and resolution tracking.
 *
 * This test validates the complete ban appeal lifecycle:
 *
 * 1. Create moderator and member accounts for testing
 * 2. Create a community with the moderator assigned
 * 3. Create a ban against a member
 * 4. Record the appeal submission timestamp when member appeals
 * 5. Verify appeal_submitted_at is persisted correctly
 * 6. Resolve the appeal with outcome (approved/denied)
 * 7. Verify appeal_resolved_at and appeal_approved are recorded
 * 8. Confirm appeal workflow timestamps persist and are independent
 * 9. Fetch the ban record and validate complete appeal timeline
 */
export async function test_api_community_ban_update_appeal_submission_tracking(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: "TestPassword123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create member account (the one to be banned)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: "TestPassword123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 3. Create another member account (community creator)
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creator = await api.functional.auth.member.join(connection, {
    body: {
      email: creatorEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: "TestPassword123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(creator);

  // 4. Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          identifier: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Switch to moderator and assign them to the community
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "TestPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 6. Appoint moderator to community (requires creator context, so switch back)
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: "TestPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const communityModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: moderator.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(communityModerator);

  // 7. Switch to moderator account for ban operations
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "TestPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 8. Create a ban against the member
  const banReason = "Violation of community rules";
  const ban =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: member.id,
          ban_type: "temporary",
          reason: banReason,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);

  // 9. Verify initial ban state - no appeal submitted
  TestValidator.equals(
    "initial ban should have no appeal_submitted_at",
    ban.appeal_submitted_at,
    null,
  );
  TestValidator.equals(
    "initial ban should have no appeal_resolved_at",
    ban.appeal_resolved_at,
    null,
  );
  TestValidator.equals(
    "initial ban should have no appeal_approved",
    ban.appeal_approved,
    null,
  );

  // 10. Record appeal submission - member submits appeal
  const appealSubmittedTime = new Date().toISOString();
  const banAfterAppealSubmission =
    await api.functional.communityPlatform.moderator.communities.bans.update(
      connection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          appeal_submitted_at: appealSubmittedTime,
        } satisfies ICommunityPlatformCommunityBan.IUpdate,
      },
    );
  typia.assert(banAfterAppealSubmission);

  // 11. Verify appeal submission timestamp is persisted
  TestValidator.predicate(
    "appeal_submitted_at should be set after submission",
    banAfterAppealSubmission.appeal_submitted_at !== null &&
      banAfterAppealSubmission.appeal_submitted_at !== undefined,
  );
  TestValidator.equals(
    "appeal_submitted_at should match submission time",
    banAfterAppealSubmission.appeal_submitted_at,
    appealSubmittedTime,
  );

  // 12. Verify appeal_resolved_at and appeal_approved are still null
  TestValidator.equals(
    "appeal_resolved_at should still be null",
    banAfterAppealSubmission.appeal_resolved_at,
    null,
  );
  TestValidator.equals(
    "appeal_approved should still be null",
    banAfterAppealSubmission.appeal_approved,
    null,
  );

  // 13. Resolve the appeal (approved)
  const appealResolvedTime = new Date().toISOString();
  const banAfterResolution =
    await api.functional.communityPlatform.moderator.communities.bans.update(
      connection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          appeal_resolved_at: appealResolvedTime,
          appeal_approved: true,
        } satisfies ICommunityPlatformCommunityBan.IUpdate,
      },
    );
  typia.assert(banAfterResolution);

  // 14. Verify appeal resolution is recorded
  TestValidator.predicate(
    "appeal_resolved_at should be set after resolution",
    banAfterResolution.appeal_resolved_at !== null &&
      banAfterResolution.appeal_resolved_at !== undefined,
  );
  TestValidator.equals(
    "appeal_resolved_at should match resolution time",
    banAfterResolution.appeal_resolved_at,
    appealResolvedTime,
  );
  TestValidator.equals(
    "appeal_approved should be true",
    banAfterResolution.appeal_approved,
    true,
  );

  // 15. Verify appeal submission timestamp persists after resolution
  TestValidator.equals(
    "appeal_submitted_at should persist after resolution",
    banAfterResolution.appeal_submitted_at,
    appealSubmittedTime,
  );

  // 16. Validate complete appeal timeline
  TestValidator.predicate(
    "appeal_submitted_at should come before appeal_resolved_at",
    new Date(banAfterResolution.appeal_submitted_at!).getTime() <
      new Date(banAfterResolution.appeal_resolved_at!).getTime(),
  );
}
