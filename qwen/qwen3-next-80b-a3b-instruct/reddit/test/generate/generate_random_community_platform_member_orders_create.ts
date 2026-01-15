import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrder";
import { prepare_random_community_platform_order } from "../prepare/prepare_random_community_platform_order";
export async function generate_random_community_platform_member_orders_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformOrder.ICreate> | undefined;
  },
): Promise<ICommunityPlatformOrder> {
  const prepared: ICommunityPlatformOrder.ICreate =
    prepare_random_community_platform_order(props.body);
  return await api.functional.communityPlatform.member.orders.create(
    connection,
    {
      body: prepared,
    },
  );
}
