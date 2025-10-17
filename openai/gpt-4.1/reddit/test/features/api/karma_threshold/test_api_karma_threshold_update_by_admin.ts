import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaThreshold } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaThreshold";
import type { ICommunityPlatformKarmaThresholds } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaThresholds";

export async function test_api_karma_threshold_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate
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

  // 2. Create a new community (scope testing)
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create an initial community-scoped karma threshold
  const initialThreshold: ICommunityPlatformKarmaThresholds =
    await api.functional.communityPlatform.admin.karmaThresholds.create(
      connection,
      {
        body: {
          community_platform_community_id: community.id,
          threshold_type: "post_creation",
          threshold_value: 10,
          feature_lock_reason: "Minimum karma required to post",
        } satisfies ICommunityPlatformKarmaThresholds.ICreate,
      },
    );
  typia.assert(initialThreshold);

  // 4. Success path: update threshold_type, value, lock reason
  const updateBody = {
    threshold_type: "comment_voting",
    threshold_value: 42,
    feature_lock_reason: "Raised to slow down spam comments",
  } satisfies ICommunityPlatformKarmaThreshold.IUpdate;
  const updated: ICommunityPlatformKarmaThreshold =
    await api.functional.communityPlatform.admin.karmaThresholds.update(
      connection,
      {
        karmaThresholdId: initialThreshold.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals("id persists", updated.id, initialThreshold.id);
  TestValidator.equals(
    "type updated",
    updated.threshold_type,
    updateBody.threshold_type,
  );
  TestValidator.equals(
    "value updated",
    updated.threshold_value,
    updateBody.threshold_value,
  );
  TestValidator.equals(
    "lock reason updated",
    updated.feature_lock_reason,
    updateBody.feature_lock_reason,
  );

  // 5. Error case: duplicate threshold_type for same community
  // create another threshold with new type
  const duplicate: ICommunityPlatformKarmaThresholds =
    await api.functional.communityPlatform.admin.karmaThresholds.create(
      connection,
      {
        body: {
          community_platform_community_id: community.id,
          threshold_type: "comment_posting",
          threshold_value: 2,
          feature_lock_reason: "Comment posting restriction",
        } satisfies ICommunityPlatformKarmaThresholds.ICreate,
      },
    );
  typia.assert(duplicate);

  // try to update the first threshold to have a duplicate type
  await TestValidator.error(
    "duplicate threshold_type within community is disallowed",
    async () => {
      await api.functional.communityPlatform.admin.karmaThresholds.update(
        connection,
        {
          karmaThresholdId: initialThreshold.id,
          body: {
            threshold_type: duplicate.threshold_type,
          } satisfies ICommunityPlatformKarmaThreshold.IUpdate,
        },
      );
    },
  );

  // 6. Error case: out-of-policy threshold_value (negative or unreasonably high)
  await TestValidator.error(
    "out-of-policy negative threshold_value should be rejected",
    async () => {
      await api.functional.communityPlatform.admin.karmaThresholds.update(
        connection,
        {
          karmaThresholdId: initialThreshold.id,
          body: {
            threshold_value: -10000,
          } satisfies ICommunityPlatformKarmaThreshold.IUpdate,
        },
      );
    },
  );

  await TestValidator.error(
    "out-of-policy high threshold_value should be rejected",
    async () => {
      await api.functional.communityPlatform.admin.karmaThresholds.update(
        connection,
        {
          karmaThresholdId: initialThreshold.id,
          body: {
            threshold_value: 1000000,
          } satisfies ICommunityPlatformKarmaThreshold.IUpdate,
        },
      );
    },
  );

  // 7. Error case: unauthorized (simulate by fresh connection without admin login)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot update karma threshold",
    async () => {
      await api.functional.communityPlatform.admin.karmaThresholds.update(
        unauthConn,
        {
          karmaThresholdId: initialThreshold.id,
          body: {
            threshold_value: 99,
          } satisfies ICommunityPlatformKarmaThreshold.IUpdate,
        },
      );
    },
  );

  // 8. Edge: update with only some fields populated/null
  const updatePartial = {
    threshold_type: "subscription_unlock",
    threshold_value: 7,
    feature_lock_reason: null,
  } satisfies ICommunityPlatformKarmaThreshold.IUpdate;
  const updatedPartial: ICommunityPlatformKarmaThreshold =
    await api.functional.communityPlatform.admin.karmaThresholds.update(
      connection,
      {
        karmaThresholdId: initialThreshold.id,
        body: updatePartial,
      },
    );
  typia.assert(updatedPartial);
  TestValidator.equals(
    "partial update threshold_type",
    updatedPartial.threshold_type,
    updatePartial.threshold_type,
  );
  TestValidator.equals(
    "partial update value",
    updatedPartial.threshold_value,
    updatePartial.threshold_value,
  );
  TestValidator.equals(
    "partial update feature_lock_reason",
    updatedPartial.feature_lock_reason,
    updatePartial.feature_lock_reason,
  );
  // Ensure audit/id fields did not change
  TestValidator.equals(
    "id remains after partial update",
    updatedPartial.id,
    initialThreshold.id,
  );
}
