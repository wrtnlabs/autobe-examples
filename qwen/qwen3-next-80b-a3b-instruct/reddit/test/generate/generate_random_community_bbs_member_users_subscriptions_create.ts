import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySubscription";
import { prepare_random_community_bbs_community_subscription } from "../prepare/prepare_random_community_bbs_community_subscription";
export async function generate_random_community_bbs_member_users_subscriptions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityBbsCommunitySubscription.ICreate> | undefined;
  },
): Promise<void> {
  const prepared: ICommunityBbsCommunitySubscription.ICreate =
    prepare_random_community_bbs_community_subscription(props.body);
  return await api.functional.communityBbs.member.users.subscriptions.create(
    connection,
    {
      body: prepared,
    },
  );
}
