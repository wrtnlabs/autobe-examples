import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderCancellation";
import { prepare_random_community_platform_order_cancellation } from "../prepare/prepare_random_community_platform_order_cancellation";
export async function generate_random_community_platform_member_orders_cancellations_cancel(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformOrderCancellation.ICreate> | undefined;
    params: {
      orderId: string;
    };
  },
): Promise<ICommunityPlatformOrderCancellation> {
  const prepared: ICommunityPlatformOrderCancellation.ICreate =
    prepare_random_community_platform_order_cancellation(props.body);
  return await api.functional.communityPlatform.member.orders.cancellations.cancel(
    connection,
    {
      body: prepared,
      orderId: props.params.orderId,
    },
  );
}
