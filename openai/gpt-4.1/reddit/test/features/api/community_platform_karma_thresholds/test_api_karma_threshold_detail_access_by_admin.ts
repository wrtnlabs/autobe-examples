import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaThresholds } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaThresholds";

/**
 * Validate detailed admin-only access to a specific karma threshold
 * configuration.
 *
 * 1. Register a new platform admin (auth/admin/join).
 * 2. Create a new community as a member (for threshold binding).
 * 3. Create a community-linked karma threshold as admin.
 * 4. Retrieve threshold details as the same admin; verify all fields match
 *    creation.
 * 5. Attempt threshold detail access with unauthenticated connection; expect
 *    error.
 */
export async function test_api_karma_threshold_detail_access_by_admin(
  connection: api.IConnection,
) {
  // 1. Register & authenticate platform admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        superuser: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a community (as member, but reuse admin's token context)
  const communityCreate = {
    name: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 7,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityCreate },
    );
  typia.assert(community);

  // 3. Create a new karma threshold as admin
  const thresholdCreate = {
    community_platform_community_id: community.id,
    threshold_type: RandomGenerator.pick([
      "post_creation",
      "comment_voting",
      "subscription_unlock",
    ] as const),
    threshold_value: typia.random<number & tags.Type<"int32">>(),
    feature_lock_reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformKarmaThresholds.ICreate;
  const threshold: ICommunityPlatformKarmaThresholds =
    await api.functional.communityPlatform.admin.karmaThresholds.create(
      connection,
      { body: thresholdCreate },
    );
  typia.assert(threshold);

  // 4. Retrieve the threshold details as the admin - detail fields should match
  const thresholdDetail: ICommunityPlatformKarmaThresholds =
    await api.functional.communityPlatform.admin.karmaThresholds.at(
      connection,
      { karmaThresholdId: threshold.id },
    );
  typia.assert(thresholdDetail);
  TestValidator.equals(
    "karma threshold id matches",
    thresholdDetail.id,
    threshold.id,
  );
  TestValidator.equals(
    "community id matches",
    thresholdDetail.community_platform_community_id,
    thresholdCreate.community_platform_community_id,
  );
  TestValidator.equals(
    "threshold type matches",
    thresholdDetail.threshold_type,
    thresholdCreate.threshold_type,
  );
  TestValidator.equals(
    "threshold value matches",
    thresholdDetail.threshold_value,
    thresholdCreate.threshold_value,
  );
  TestValidator.equals(
    "feature lock reason matches",
    thresholdDetail.feature_lock_reason,
    thresholdCreate.feature_lock_reason,
  );

  // 5. Attempt to access threshold details as unauthenticated user -- should error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access to karma threshold detail should be denied",
    async () => {
      await api.functional.communityPlatform.admin.karmaThresholds.at(
        unauthConn,
        { karmaThresholdId: threshold.id },
      );
    },
  );
}
