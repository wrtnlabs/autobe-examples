import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_communities_subscriptions_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";

/**
 * Test duplicate subscription prevention for member-community relationships.
 *
 * Validates that the system enforces a unique constraint on member-community subscription pairs, preventing a member from subscribing to the same community multiple times. The test authenticates a member, retrieves a community, attempts to subscribe twice, and verifies that the first subscription succeeds while the second fails with a conflict error.
 *
 * Special attention is given to ensuring the original subscription remains active after the failed duplicate attempt and that the error response correctly indicates a 409 Conflict status.
 *
 * 1. Authenticate as a member using the join operation to obtain valid JWT tokens.
 * 2. Retrieve a valid community from the communities list.
 * 3. First subscription attempt: Create a subscription linking the member to the community.
 * 4. Verify the first subscription is successful and active (deleted_at is null).
 * 5. Second subscription attempt: Try to create the same subscription again.
 * 6. Verify the second attempt fails with HTTP 409 Conflict error.
 * 7. Confirm the original subscription remains unchanged and active.
 */
export async function test_api_subscription_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Retrieve a valid community
  const communitiesResponse =
    await api.functional.redditClone.communities.index(memberConnection, {
      body: {} satisfies IRedditCloneCommunity.IRequest,
    });
  typia.assert(communitiesResponse);
  if (communitiesResponse.data.length === 0) {
    throw new Error("No communities available for subscription test");
  }
  const community = communitiesResponse.data[0];
  typia.assert(community);
  // 3. First subscription attempt
  const firstSubscription =
    await generate_random_reddit_clone_member_communities_subscriptions_create(
      memberConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(firstSubscription);
  // 4. Verify first subscription is active
  TestValidator.equals(
    "first subscription is active",
    firstSubscription.deleted_at,
    null,
  );
  // 5. Second subscription attempt - should fail with 409 Conflict
  await TestValidator.httpError(
    "duplicate subscription returns 409 Conflict",
    409,
    async () => {
      await generate_random_reddit_clone_member_communities_subscriptions_create(
        memberConnection,
        {
          params: {
            communityId: community.id,
          },
        },
      );
    },
  );
  // 6. Verify original subscription still exists and is active
  TestValidator.predicate(
    "original subscription remains active",
    firstSubscription.deleted_at === null,
  );
}
