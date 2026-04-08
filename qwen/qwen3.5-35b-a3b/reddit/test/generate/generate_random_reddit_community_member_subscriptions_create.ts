import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community_subscription } from "../prepare/prepare_random_reddit_community_subscription";

export async function generate_random_reddit_community_member_subscriptions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunitySubscription.ICreate> | undefined;
  },
): Promise<IRedditCommunitySubscription> {
  const prepared: IRedditCommunitySubscription.ICreate =
    prepare_random_reddit_community_subscription(props.body);
  const result: IRedditCommunitySubscription =
    await api.functional.redditCommunity.member.subscriptions.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
