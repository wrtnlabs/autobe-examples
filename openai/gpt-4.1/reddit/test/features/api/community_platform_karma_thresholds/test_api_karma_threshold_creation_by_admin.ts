import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaThresholds } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaThresholds";

/**
 * Validate admin creation of karma thresholds (global and community-specific).
 *
 * Steps:
 *
 * 1. Register a new platform admin account
 * 2. Create a new community as prerequisite for threshold targeting
 * 3. Create a platform-wide (global) karma threshold
 * 4. Assert global threshold response fields are correct and contain no community
 *    reference
 * 5. Create a community-specific karma threshold with a different type
 * 6. Assert community-scoped threshold response fields reference the new community
 * 7. Attempt to create a threshold with duplicate threshold_type for same scope
 *    (should error)
 * 8. Attempt to create a threshold referencing a non-existent community (should
 *    error)
 */
export async function test_api_karma_threshold_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 2. Create a community for community-specific threshold
  const communityReq = {
    name: RandomGenerator.name(2).replace(/\s+/g, "_").toLowerCase(), // unique string
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    slug: RandomGenerator.alphaNumeric(12).toLowerCase(),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityReq,
      },
    );
  typia.assert(community);

  // 3. Create a global (platform-wide) karma threshold
  const thresholdTypeGlobal = `post_creation_${RandomGenerator.alphaNumeric(6)}`;
  const thresholdValueGlobal = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
  >();
  const globalThreshold: ICommunityPlatformKarmaThresholds =
    await api.functional.communityPlatform.admin.karmaThresholds.create(
      connection,
      {
        body: {
          community_platform_community_id: null,
          threshold_type: thresholdTypeGlobal,
          threshold_value: thresholdValueGlobal,
          feature_lock_reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformKarmaThresholds.ICreate,
      },
    );
  typia.assert(globalThreshold);
  TestValidator.equals(
    "global threshold scope has null community",
    globalThreshold.community_platform_community_id,
    null,
  );
  TestValidator.equals(
    "global threshold type matches",
    globalThreshold.threshold_type,
    thresholdTypeGlobal,
  );
  TestValidator.equals(
    "global threshold value matches",
    globalThreshold.threshold_value,
    thresholdValueGlobal,
  );

  // 4. Create a community-level karma threshold with a different type
  const thresholdTypeCommunity = `comment_voting_${RandomGenerator.alphaNumeric(6)}`;
  const thresholdValueCommunity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1100>
  >();
  const communityThreshold =
    await api.functional.communityPlatform.admin.karmaThresholds.create(
      connection,
      {
        body: {
          community_platform_community_id: community.id,
          threshold_type: thresholdTypeCommunity,
          threshold_value: thresholdValueCommunity,
          feature_lock_reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformKarmaThresholds.ICreate,
      },
    );
  typia.assert(communityThreshold);
  TestValidator.equals(
    "community threshold scope ref matches",
    communityThreshold.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "community threshold type matches",
    communityThreshold.threshold_type,
    thresholdTypeCommunity,
  );
  TestValidator.equals(
    "community threshold value matches",
    communityThreshold.threshold_value,
    thresholdValueCommunity,
  );

  // 5. Attempt to create duplicate threshold_type in same (global) scope (error)
  await TestValidator.error(
    "duplicate global threshold_type should error",
    async () => {
      await api.functional.communityPlatform.admin.karmaThresholds.create(
        connection,
        {
          body: {
            community_platform_community_id: null,
            threshold_type: thresholdTypeGlobal,
            threshold_value: thresholdValueGlobal + 1,
            feature_lock_reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformKarmaThresholds.ICreate,
        },
      );
    },
  );

  // 6. Attempt to reference a non-existent community for threshold (error)
  await TestValidator.error(
    "non-existent community id should error",
    async () => {
      await api.functional.communityPlatform.admin.karmaThresholds.create(
        connection,
        {
          body: {
            community_platform_community_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            threshold_type: `random_threshold_${RandomGenerator.alphaNumeric(6)}`,
            threshold_value: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1100>
            >(),
            feature_lock_reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformKarmaThresholds.ICreate,
        },
      );
    },
  );
}
