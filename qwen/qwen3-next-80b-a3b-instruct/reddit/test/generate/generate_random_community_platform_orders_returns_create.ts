import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderReturn";
import type { ICommunityPlatformOrderReturnItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderReturnItem";
import { prepare_random_community_platform_order_return } from "../prepare/prepare_random_community_platform_order_return";
export async function generate_random_community_platform_orders_returns_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformOrderReturn.ICreate>;
    params: {
      orderId: string;
    };
  },
): Promise<ICommunityPlatformOrderReturn> {
  const prepared: ICommunityPlatformOrderReturn.ICreate =
    prepare_random_community_platform_order_return(props.body);
  return await api.functional.communityPlatform.orders.returns.create(
    connection,
    {
      body: prepared,
      orderId: props.params.orderId,
    },
  );
}
