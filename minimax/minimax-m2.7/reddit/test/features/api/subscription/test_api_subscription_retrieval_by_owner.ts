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

export async function test_api_subscription_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IRedditCloneMember.IAuthorized =
    await authorize_member_join(memberConnection, {});
  // Step 2: Create a community to subscribe to
  const community: IRedditCloneCommunity =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  // Step 3: Subscribe to the created community
  const subscription: IRedditCloneSubscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
        },
      },
    );
  // Step 4: Retrieve subscription details using the target endpoint
  const subscriptionDetail: IRedditCloneSubscription.IInvert =
    await api.functional.redditClone.member.subscriptions.at(memberConnection, {
      subscriptionId: subscription.id,
    });
  // Step 5: Validate the response using typia.assert
  typia.assert(subscriptionDetail);
  // Additional business logic validations
  TestValidator.equals(
    "member id matches authenticated user",
    subscriptionDetail.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "member username matches authenticated user",
    subscriptionDetail.member.username,
    authorized.username,
  );
  TestValidator.equals(
    "community id matches created community",
    subscriptionDetail.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches created community",
    subscriptionDetail.community.name,
    community.name,
  );
  TestValidator.predicate(
    "subscription has valid createdAt",
    subscriptionDetail.createdAt.length > 0,
  );
}
