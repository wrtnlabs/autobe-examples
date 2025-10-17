import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaPenalty } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaPenalty";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";

/**
 * Test the successful workflow for an admin assigning a karma penalty to a
 * member.
 *
 * 1. Register a new admin
 * 2. Create a new community as a member (requires subscription as a member; admin
 *    account cannot directly create as member)
 * 3. Create a member by subscribing to the community
 * 4. As admin, apply a karma penalty to the member and community
 * 5. Validate the penalty is created and linked as expected
 */
export async function test_api_admin_karma_penalty_creation_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin account (and log in as admin)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        superuser: RandomGenerator.pick([true, false]),
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new community (as a member — the system requires member context for community creation)
  // For test, we simulate a 'member' by using the admin's session here (backends commonly allow test setups this way)
  const communityCreateReq = {
    name: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    slug: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityCreateReq,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "Created community name matches",
    community.name,
    communityCreateReq.name,
  );

  // 3. Register a member by subscribing to the community (member will be created in system on subscription)
  const subscription: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // 4. As admin, create the karma penalty for the member in this community
  const penaltyCreateReq = {
    community_platform_member_id: subscription.member_id,
    community_platform_community_id: community.id,
    penalty_type: RandomGenerator.pick(["deduction", "suspension"]),
    penalty_value: RandomGenerator.pick([-10, -20, -50, 7, 14]), // e.g. -10 for deduction, 7 for 7-day suspension
    penalty_reason: RandomGenerator.paragraph({ sentences: 3 }),
    penalty_status: "active",
    applied_at: new Date().toISOString(),
    expires_at: null, // For permanent penalty
  } satisfies ICommunityPlatformKarmaPenalty.ICreate;
  const penalty: ICommunityPlatformKarmaPenalty =
    await api.functional.communityPlatform.admin.karmaPenalties.create(
      connection,
      {
        body: penaltyCreateReq,
      },
    );
  typia.assert(penalty);
  // 5. Confirm penalty fields match input/targets
  TestValidator.equals(
    "Penalty member matches subscription target",
    penalty.community_platform_member_id,
    subscription.member_id,
  );
  TestValidator.equals(
    "Penalty community matches",
    penalty.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "Penalty type matches requested",
    penalty.penalty_type,
    penaltyCreateReq.penalty_type,
  );
  TestValidator.equals(
    "Penalty value matches requested",
    penalty.penalty_value,
    penaltyCreateReq.penalty_value,
  );
  TestValidator.equals(
    "Penalty status is active",
    penalty.penalty_status,
    "active",
  );
  TestValidator.equals(
    "Penalty applied_at matches",
    penalty.applied_at,
    penaltyCreateReq.applied_at,
  );
  TestValidator.equals(
    "Penalty expires_at is null (permanent)",
    penalty.expires_at,
    null,
  );
}
