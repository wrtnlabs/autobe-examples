import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

export async function test_api_community_subscription_retrieve_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community (member automatically becomes subscribed)
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Retrieve subscription status for the created community
  const subscription =
    await api.functional.redditLike.member.communities.subscription.at(
      memberConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // 4. Validate subscription details - member is subscribed to their created community
  TestValidator.equals(
    "subscription member matches creator",
    subscription.member.id,
    member.id,
  );
  TestValidator.equals(
    "subscription community matches created community",
    subscription.community.id,
    community.id,
  );
  TestValidator.predicate(
    "subscription is active (deleted_at is null)",
    subscription.deleted_at === null,
  );
}
