import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformContentPolicyCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentPolicyCategory";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Community moderator extends a temporary ban and changes its policy
 * classification.
 *
 * Business workflow:
 *
 * 1. Platform admin bootstraps global master data (account status, community
 *    visibility level, content policy category, report reason category).
 * 2. Member user registers and creates a community that uses the configured
 *    visibility level.
 * 3. Member user submits a membership request to that community to simulate a real
 *    member context.
 * 4. Community moderator registers (which authenticates the actor via SDK
 *    Authorization handling).
 * 5. Community moderator issues an initial temporary ban for the member user in
 *    the community, with a near-future expires_at and an initial
 *    policy_category.
 * 6. Moderator later updates the ban: extends expires_at further into the future,
 *    changes the policy_category string to a different category code, and
 *    updates the free-text reason.
 * 7. The updated ban is returned and must reflect the new expires_at,
 *    policy_category, and reason while preserving identity fields and
 *    started_at; is_active should remain true.
 */
export async function test_api_community_ban_update_by_community_moderator_extend_temporary_ban_with_policy_change(
  connection: api.IConnection,
) {
  // 1) Register platform admin to configure master data (join also authenticates)
  const platformAdminJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: `${RandomGenerator.alphabets(8)}@platform.test` as string &
          tags.Format<"email">,
        password: RandomGenerator.alphabets(12),
        displayName: RandomGenerator.name(),
        ip: undefined,
        href: "https://platform.test/admin/join" as string & tags.Format<"uri">,
        referrer: "https://platform.test/landing" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminJoin);

  // Create an account status to ensure lifecycle master data exists
  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: {
          key: `ACTIVE_${RandomGenerator.alphabets(4)}`,
          label: "Active member",
          description: "Automatically active for new accounts",
          isLoginAllowed: true,
          isPostingAllowed: true,
          isVotingAllowed: true,
          requiresManualReview: false,
        } satisfies ICommunityPlatformAccountStatus.ICreate,
      },
    );
  typia.assert(accountStatus);

  // Create a community visibility level
  const visibilityCode = `public_${RandomGenerator.alphabets(5)}`;
  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: "Public",
          description: "Publicly visible community",
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibility);

  // Create two content policy categories so we can switch between them
  const initialPolicyCode = `spam_${RandomGenerator.alphabets(5)}`;
  const initialPolicy: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      {
        body: {
          code: initialPolicyCode,
          name: "Spam",
          description: "Unsolicited or repetitive content",
          isActive: true,
          isDefault: true,
        } satisfies ICommunityPlatformContentPolicyCategory.ICreate,
      },
    );
  typia.assert(initialPolicy);

  const escalatedPolicyCode = `harassment_${RandomGenerator.alphabets(5)}`;
  const escalatedPolicy: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      {
        body: {
          code: escalatedPolicyCode,
          name: "Harassment",
          description: "Harassment and abusive behavior",
          isActive: true,
          isDefault: false,
        } satisfies ICommunityPlatformContentPolicyCategory.ICreate,
      },
    );
  typia.assert(escalatedPolicy);

  // Create a report reason category for completeness
  const reportReasonCode = `harassment_reason_${RandomGenerator.alphabets(5)}`;
  const reportReason: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: {
          code: reportReasonCode,
          name: "Harassment report",
          description: "Used when reporting harassment incidents",
          is_user_visible: true,
          is_active: true,
        } satisfies ICommunityPlatformReportReasonCategory.ICreate,
      },
    );
  typia.assert(reportReason);

  // 2) Register a member user (join also authenticates as memberUser)
  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: `${RandomGenerator.alphabets(8)}@member.test` as string &
          tags.Format<"email">,
        password: RandomGenerator.alphabets(12),
        ip: undefined,
        href: "https://platform.test/member/join" as string &
          tags.Format<"uri">,
        referrer: "https://platform.test/landing" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberJoin);

  // 3) As member user, create a community using the visibility level code
  const communityIdentifier = `comm_${RandomGenerator.alphabets(6)}`;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: "Test Community for Ban Workflow",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4) Member user creates a membership request in that community
  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: {
          questionKey: "why_join",
          answerText: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate,
      },
    );
  typia.assert(membershipRequest);

  // 5) Register a community moderator (join also authenticates as communityModerator)
  const moderatorJoin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: `${RandomGenerator.alphabets(8)}@moderator.test` as string &
          tags.Format<"email">,
        password: RandomGenerator.alphabets(12),
        display_name: RandomGenerator.name(),
        ip: undefined,
        href: "https://platform.test/moderator/join" as string &
          tags.Format<"uri">,
        referrer: "https://platform.test/landing" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert(moderatorJoin);

  // 6) Moderator creates initial temporary ban with near-future expiry
  const now = new Date();
  const startedAt = now.toISOString() as string & tags.Format<"date-time">;
  const initialExpires = new Date(
    now.getTime() + 60 * 60 * 1000,
  ).toISOString() as (string & tags.Format<"date-time">) | null;

  const initialBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: {
          memberuser_id: memberJoin.id,
          reason: "Initial temporary ban for suspected spam",
          policy_category: initialPolicy.code,
          started_at: startedAt,
          expires_at: initialExpires,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(initialBan);

  TestValidator.predicate(
    "initial ban should be active and have initial policy",
    initialBan.is_active === true &&
      initialBan.policy_category === initialPolicy.code,
  );

  // 7) Moderator updates the ban: extend expiry, change policy_category and reason
  const extendedExpires = new Date(
    now.getTime() + 2 * 60 * 60 * 1000,
  ).toISOString() as (string & tags.Format<"date-time">) | null;
  const updatedReason = "Escalated to harassment after additional evidence";

  const updatedBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.update(
      connection,
      {
        communityIdentifier: community.identifier,
        banId: initialBan.id,
        body: {
          reason: updatedReason,
          policy_category: escalatedPolicy.code,
          expires_at: extendedExpires,
        } satisfies ICommunityPlatformCommunityBan.IUpdate,
      },
    );
  typia.assert(updatedBan);

  // 8) Assertions: identities and started_at unchanged, expiry and policy updated, still active
  TestValidator.equals("ban id remains the same", updatedBan.id, initialBan.id);

  TestValidator.equals(
    "community identity remains the same",
    updatedBan.community.id,
    initialBan.community.id,
  );

  TestValidator.equals(
    "member user identity remains the same",
    updatedBan.memberUser.id,
    initialBan.memberUser.id,
  );

  TestValidator.equals(
    "started_at remains unchanged",
    updatedBan.started_at,
    initialBan.started_at,
  );

  TestValidator.equals(
    "expires_at has been extended to the later timestamp",
    updatedBan.expires_at,
    extendedExpires,
  );

  TestValidator.equals(
    "policy_category has been updated to escalated category",
    updatedBan.policy_category,
    escalatedPolicy.code,
  );

  TestValidator.equals(
    "reason has been updated to new explanation",
    updatedBan.reason,
    updatedReason,
  );

  TestValidator.predicate(
    "ban remains active after update",
    updatedBan.is_active === true,
  );
}
