import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_subscription } from "../prepare/prepare_random_reddit_platform_subscription";

/**
 * Generate a random Reddit platform subscription via the API for E2E testing.
 *
 * Prepares random subscription data using the prepare function, then calls the
 * creation endpoint to create a new community subscription. The function accepts
 * optional DeepPartial<IRedditPlatformSubscription.ICreate> for customization.
 */
export async function generate_random_reddit_platform_member_subscriptions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformSubscription.ICreate>;
  },
): Promise<IRedditPlatformSubscription> {
  const prepared: IRedditPlatformSubscription.ICreate =
    prepare_random_reddit_platform_subscription(props.body);
  const result: IRedditPlatformSubscription =
    await api.functional.redditPlatform.member.subscriptions.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
