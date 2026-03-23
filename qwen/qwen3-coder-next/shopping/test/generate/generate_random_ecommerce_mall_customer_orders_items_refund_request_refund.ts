import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_refund_request } from "../prepare/prepare_random_ecommerce_mall_refund_request";

export async function generate_random_ecommerce_mall_customer_orders_items_refund_request_refund(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallRefundRequest.ICreate> | undefined;
    params: {
      orderId: string;
      orderItemId: string;
    };
  },
): Promise<IEcommerceMallRefundRequest> {
  const prepared: IEcommerceMallRefundRequest.ICreate =
    prepare_random_ecommerce_mall_refund_request(props.body);
  return await api.functional.ecommerceMall.customer.orders.items.refund.requestRefund(
    connection,
    {
      body: prepared,
      orderId: props.params.orderId,
      orderItemId: props.params.orderItemId,
    },
  );
}
