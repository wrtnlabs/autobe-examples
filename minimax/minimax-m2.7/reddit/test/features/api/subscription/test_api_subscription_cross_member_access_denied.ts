import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

/**
 * Test that a member cannot retrieve another member's subscription details.
 *
 * This test validates proper authorization enforcement where members can only
 * access their own subscription information. Member B should receive a 404
 * error when attempting to access Member A's subscription.
 *
 * Steps:
 * 1. Authenticate as Member A using /redditClone/auth/member/join
 * 2. Create a community for Member A to subscribe to
 * 3. Subscribe Member A to the community
 * 4. Authenticate as Member B
 * 5. Attempt to retrieve Member A's subscription (should fail with 404)
 */
export async function test_api_subscription_cross_member_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {});
  // Step 2: Create a community for Member A to subscribe to
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {},
    );
  // Step 3: Subscribe Member A to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberAConnection,
      {
        body: {
          communityId: community.id,
        },
      },
    );
  // Step 4: Authenticate as Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // Step 5: Member B attempts to access Member A's subscription
  // This should fail with 404 - Member B can only access their own subscriptions
  await TestValidator.httpError(
    "Member B cannot access Member A's subscription",
    404,
    async () =>
      await api.functional.redditClone.member.subscriptions.at(
        memberBConnection,
        {
          subscriptionId: subscription.id,
        },
      ),
  );
}
