import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaThresholds } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaThresholds";

/**
 * Validate hard-deletion of a karma threshold by authenticated admin, proper
 * error handling, and access control
 *
 * 1. Register and authenticate as platform admin
 * 2. Create a context community for community-scoped threshold
 * 3. Create a new karma threshold (scoped to created community)
 * 4. Delete the created threshold successfully (should not throw)
 * 5. Confirm repeated deletion fails (resource not found or already deleted)
 * 6. Confirm deleting clearly non-existent ID yields error
 * 7. Confirm unauthenticated user cannot delete a threshold
 */
export async function test_api_karma_threshold_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register as platform admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongPa$w0rd-!",
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a community for threshold context
  const communityBody = {
    name: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create karma threshold
  const thresholdBody = {
    community_platform_community_id: community.id,
    threshold_type: RandomGenerator.pick([
      "post_creation",
      "comment_voting",
      "subscription_unlock",
    ] as const),
    threshold_value: typia.random<number & tags.Type<"int32">>(),
    feature_lock_reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformKarmaThresholds.ICreate;
  const threshold =
    await api.functional.communityPlatform.admin.karmaThresholds.create(
      connection,
      { body: thresholdBody },
    );
  typia.assert(threshold);
  TestValidator.equals(
    "threshold context id",
    threshold.community_platform_community_id,
    community.id,
  );

  // 4. Delete threshold (should succeed)
  await api.functional.communityPlatform.admin.karmaThresholds.erase(
    connection,
    { karmaThresholdId: threshold.id },
  );

  // 5. Try deleting again - expect error
  await TestValidator.error(
    "deleting already deleted threshold should fail",
    async () => {
      await api.functional.communityPlatform.admin.karmaThresholds.erase(
        connection,
        { karmaThresholdId: threshold.id },
      );
    },
  );

  // 6. Try deleting non-existent id - expect error
  const nonexistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent threshold should fail",
    async () => {
      await api.functional.communityPlatform.admin.karmaThresholds.erase(
        connection,
        { karmaThresholdId: nonexistentId },
      );
    },
  );

  // 7. Try unauthenticated user - clone connection and clear headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated delete must fail", async () => {
    await api.functional.communityPlatform.admin.karmaThresholds.erase(
      unauthConn,
      { karmaThresholdId: threshold.id },
    );
  });
}
