import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_subscription } from "../prepare/prepare_random_reddit_clone_subscription";

export async function generate_random_reddit_clone_member_subscriptions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneSubscription.ICreate>;
  },
): Promise<IRedditCloneSubscription> {
  const prepared: IRedditCloneSubscription.ICreate =
    prepare_random_reddit_clone_subscription(props.body);
  const result: IRedditCloneSubscription =
    await api.functional.redditClone.member.subscriptions.create(connection, {
      body: prepared,
    });
  return result;
}
