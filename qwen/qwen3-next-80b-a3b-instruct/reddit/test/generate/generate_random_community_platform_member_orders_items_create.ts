import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderItem";
import { prepare_random_community_platform_order_item } from "../prepare/prepare_random_community_platform_order_item";
export async function generate_random_community_platform_member_orders_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformOrderItem.ICreate>;
    params: {
      orderId: string;
    };
  },
): Promise<ICommunityPlatformOrderItem> {
  const prepared: ICommunityPlatformOrderItem.ICreate =
    prepare_random_community_platform_order_item(props.body);
  return await api.functional.communityPlatform.member.orders.items.create(
    connection,
    {
      body: prepared,
      orderId: props.params.orderId,
    },
  );
}
