import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaPenalty } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaPenalty";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";

/**
 * Validates admin's ability to update karma penalties after assignment.
 *
 * Test steps:
 *
 * 1. Register and authenticate as admin.
 * 2. Create a community.
 * 3. Register the target penalty member by subscribing (simulate member join).
 * 4. Register and authenticate as moderator for the same community.
 * 5. Assign a karma penalty to the member via moderator.
 * 6. As admin, update the penalty: (a) modify penalty status to 'expired', (b)
 *    change penalty_value, (c) revoke the penalty, and (d) update the
 *    penalty_reason.
 * 7. Confirm the returned penalty object reflects every change.
 * 8. Edge cases: (a) invalid state transition (e.g., 'revoked'→'active'), (b)
 *    update penalty for non-existent penalty_id (should fail).
 * 9. Use TestValidator.equals to confirm updates and TestValidator.error for
 *    negative scenarios. All request bodies are immutable 'const' objects, no
 *    type assertions.
 */
export async function test_api_admin_update_karma_penalty_review_expiry_revoke(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "A1b!" + RandomGenerator.alphaNumeric(10);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create community
  const communityName = RandomGenerator.name() + RandomGenerator.alphabets(4);
  const communitySlug = (
    RandomGenerator.name(2) + RandomGenerator.alphabets(4)
  ).replace(/\s/g, "-");
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: "Test Community - " + RandomGenerator.name(),
          slug: communitySlug,
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Register member: simulate member subscription (obtain member context)
  const memberSubscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(memberSubscription);
  const memberId = memberSubscription.member_id;

  // 4. Register and authenticate as moderator targeting the above community and member (using admin email for linkage)
  const moderatorPassword = "M1c!" + RandomGenerator.alphaNumeric(10);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: adminEmail,
      password: moderatorPassword,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);

  // 5. Moderator assigns karma penalty to member
  const appliedAt = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days from now
  const penaltyCreateBody = {
    community_platform_member_id: memberId,
    community_platform_community_id: community.id,
    penalty_type: "deduction",
    penalty_value: -10,
    penalty_reason: "Initial penalty for test",
    penalty_status: "active",
    applied_at: appliedAt,
    expires_at: expiresAt,
  } satisfies ICommunityPlatformKarmaPenalty.ICreate;
  const penalty =
    await api.functional.communityPlatform.moderator.karmaPenalties.create(
      connection,
      {
        body: penaltyCreateBody,
      },
    );
  typia.assert(penalty);
  TestValidator.equals(
    "penalty created",
    penalty.community_platform_member_id,
    memberId,
  );

  // 6. As admin: update penalty (a) status to 'expired', (b) value, (c) reason, (d) revoke
  // 6a: Status to 'expired' and penalty_value to -5
  const updateBodyStatusExpired = {
    penalty_status: "expired",
    penalty_value: -5,
    penalty_reason: "Penalty reviewed and reduced",
    expires_at: new Date().toISOString(),
  } satisfies ICommunityPlatformKarmaPenalty.IUpdate;
  const penaltyExpired =
    await api.functional.communityPlatform.admin.karmaPenalties.update(
      connection,
      {
        karmaPenaltyId: penalty.id,
        body: updateBodyStatusExpired,
      },
    );
  typia.assert(penaltyExpired);
  TestValidator.equals(
    "penalty status updated to expired",
    penaltyExpired.penalty_status,
    "expired",
  );
  TestValidator.equals(
    "penalty_value reduced after review",
    penaltyExpired.penalty_value,
    -5,
  );
  TestValidator.equals(
    "penalty_reason updated",
    penaltyExpired.penalty_reason,
    "Penalty reviewed and reduced",
  );

  // 6b: Revoke the penalty (status 'revoked')
  const revokeBody = {
    penalty_status: "revoked",
    penalty_reason: "Penalty revoked after successful appeal",
  } satisfies ICommunityPlatformKarmaPenalty.IUpdate;
  const penaltyRevoked =
    await api.functional.communityPlatform.admin.karmaPenalties.update(
      connection,
      {
        karmaPenaltyId: penalty.id,
        body: revokeBody,
      },
    );
  typia.assert(penaltyRevoked);
  TestValidator.equals(
    "penalty status set to revoked",
    penaltyRevoked.penalty_status,
    "revoked",
  );
  TestValidator.equals(
    "penalty_reason updated on revoke",
    penaltyRevoked.penalty_reason,
    "Penalty revoked after successful appeal",
  );

  // 7. Edge cases
  // 7a: Invalid state transition: revoked→active (should error)
  await TestValidator.error(
    "invalid penalty status transition: revoked to active",
    async () => {
      await api.functional.communityPlatform.admin.karmaPenalties.update(
        connection,
        {
          karmaPenaltyId: penalty.id,
          body: {
            penalty_status: "active",
          } satisfies ICommunityPlatformKarmaPenalty.IUpdate,
        },
      );
    },
  );

  // 7b: Update non-existent penalty ID (should error)
  await TestValidator.error("update non-existent penalty ID", async () => {
    await api.functional.communityPlatform.admin.karmaPenalties.update(
      connection,
      {
        karmaPenaltyId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          penalty_status: "revoked",
          penalty_reason: "Non-existent penalty",
        } satisfies ICommunityPlatformKarmaPenalty.IUpdate,
      },
    );
  });
}
