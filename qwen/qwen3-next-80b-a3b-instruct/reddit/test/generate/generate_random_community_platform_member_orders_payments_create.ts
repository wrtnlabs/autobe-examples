import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderPayment";
import type { ICommunityPlatformOrderPaymentMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderPaymentMetadata";
import { prepare_random_community_platform_order_payment } from "../prepare/prepare_random_community_platform_order_payment";
export async function generate_random_community_platform_member_orders_payments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformOrderPayment.ICreate> | undefined;
    params: {
      orderId: string;
    };
  },
): Promise<ICommunityPlatformOrderPayment> {
  const prepared: ICommunityPlatformOrderPayment.ICreate =
    prepare_random_community_platform_order_payment(props.body);
  return await api.functional.communityPlatform.member.orders.payments.create(
    connection,
    {
      body: prepared,
      orderId: props.params.orderId,
    },
  );
}
