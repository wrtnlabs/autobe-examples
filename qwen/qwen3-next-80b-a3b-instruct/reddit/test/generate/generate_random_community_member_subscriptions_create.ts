import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_subscription } from "../prepare/prepare_random_community_subscription";

export async function generate_random_community_member_subscriptions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunitySubscription.ICreate> | undefined;
  },
): Promise<ICommunitySubscription> {
  const prepared: ICommunitySubscription.ICreate =
    prepare_random_community_subscription(props.body);
  const result: ICommunitySubscription =
    await api.functional.community.member.subscriptions.create(connection, {
      body: prepared,
    });
  return result;
}
