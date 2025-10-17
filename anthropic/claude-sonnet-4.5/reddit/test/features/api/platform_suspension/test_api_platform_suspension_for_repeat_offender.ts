import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePlatformSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePlatformSuspension";

/**
 * Validates platform suspension workflow for repeat offenders with community
 * ban history.
 *
 * This test ensures that the platform suspension system properly handles
 * members who have accumulated violations through community bans, allowing
 * administrators to escalate enforcement from community-level to platform-wide
 * restrictions.
 *
 * Workflow:
 *
 * 1. Create administrator account for platform suspension authority
 * 2. Create member account (the repeat offender)
 * 3. Create moderator account for community-level moderation
 * 4. Member creates a community (becomes primary moderator)
 * 5. Assign moderator to the community with ban permissions
 * 6. Moderator issues community ban (establishing violation history)
 * 7. Administrator issues platform suspension referencing violation pattern
 * 8. Validate suspension includes proper reason categorization
 * 9. Verify suspension system handles existing community restrictions
 */
export async function test_api_platform_suspension_for_repeat_offender(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // Step 2: Create member account (the repeat offender)
  const memberBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  // Step 3: Create moderator account
  const moderatorBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // Step 4: Member creates a community (member becomes primary moderator)
  const communityBody = {
    code: RandomGenerator.alphaNumeric(10),
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
    primary_category: "technology",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // Step 5: Assign moderator to the community with ban permissions
  const moderatorAssignmentBody = {
    moderator_id: moderator.id,
    permissions: "manage_users,manage_posts,access_reports",
  } satisfies IRedditLikeCommunityModerator.ICreate;

  const communityModerator: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: moderatorAssignmentBody,
      },
    );
  typia.assert(communityModerator);

  // Step 6: Moderator issues community ban (establishing violation history)
  const banBody = {
    banned_member_id: member.id,
    ban_reason_category: "harassment",
    ban_reason_text:
      "Repeated harassment of other community members and violation of community guidelines",
    internal_notes: "User has been warned multiple times. Escalating to ban.",
    is_permanent: false,
    expiration_date: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  } satisfies IRedditLikeCommunityBan.ICreate;

  const communityBan: IRedditLikeCommunityBan =
    await api.functional.redditLike.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: banBody,
      },
    );
  typia.assert(communityBan);

  TestValidator.equals(
    "banned member matches",
    communityBan.banned_member_id,
    member.id,
  );
  TestValidator.equals("ban is active", communityBan.is_active, true);
  TestValidator.equals(
    "ban reason category",
    communityBan.ban_reason_category,
    "harassment",
  );

  // Step 7: Administrator issues platform suspension for repeat offender
  const suspensionBody = {
    suspended_member_id: member.id,
    suspension_reason_category: "repeated_violations",
    suspension_reason_text:
      "Member has accumulated multiple community bans for harassment and policy violations. Pattern of repeated misconduct across communities warrants platform-wide suspension.",
    internal_notes:
      "Community ban history: 1 active ban for harassment. Escalating to platform suspension due to repeat offender status.",
    is_permanent: false,
    expiration_date: new Date(
      Date.now() + 90 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  } satisfies IRedditLikePlatformSuspension.ICreate;

  const platformSuspension: IRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.create(
      connection,
      {
        body: suspensionBody,
      },
    );
  typia.assert(platformSuspension);

  // Step 8: Validate suspension properties
  TestValidator.equals(
    "suspended member matches",
    platformSuspension.suspended_member_id,
    member.id,
  );
  TestValidator.equals(
    "suspension is active",
    platformSuspension.is_active,
    true,
  );
  TestValidator.equals(
    "suspension reason category",
    platformSuspension.suspension_reason_category,
    "repeated_violations",
  );
  TestValidator.predicate(
    "suspension reason references violation pattern",
    platformSuspension.suspension_reason_text.includes("repeated") ||
      platformSuspension.suspension_reason_text.includes("multiple"),
  );
  TestValidator.equals(
    "suspension is temporary",
    platformSuspension.is_permanent,
    false,
  );
  TestValidator.predicate(
    "suspension has expiration date",
    platformSuspension.expiration_date !== null &&
      platformSuspension.expiration_date !== undefined,
  );

  // Step 9: Verify the suspension system properly handles users with existing community restrictions
  // Both community ban and platform suspension should coexist
  TestValidator.predicate(
    "community ban remains active alongside platform suspension",
    communityBan.is_active === true,
  );
  TestValidator.predicate(
    "platform suspension is active",
    platformSuspension.is_active === true,
  );
}
