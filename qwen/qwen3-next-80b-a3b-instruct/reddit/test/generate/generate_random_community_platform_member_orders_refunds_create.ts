import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderRefund";
import { prepare_random_community_platform_order_refund } from "../prepare/prepare_random_community_platform_order_refund";
export async function generate_random_community_platform_member_orders_refunds_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformOrderRefund.ICreate> | undefined;
    params: {
      orderId: string;
    };
  },
): Promise<ICommunityPlatformOrderRefund> {
  const prepared: ICommunityPlatformOrderRefund.ICreate =
    prepare_random_community_platform_order_refund(props.body);
  return await api.functional.communityPlatform.member.orders.refunds.create(
    connection,
    {
      body: prepared,
      orderId: props.params.orderId,
    },
  );
}
