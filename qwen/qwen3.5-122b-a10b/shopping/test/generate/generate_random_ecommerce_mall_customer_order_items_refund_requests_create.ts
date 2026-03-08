import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemRefundRequest";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_order_item_refund_request } from "../prepare/prepare_random_ecommerce_mall_order_item_refund_request";

export async function generate_random_ecommerce_mall_customer_order_items_refund_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallOrderItemRefundRequest.ICreate>;
    params: {
      orderItemId: string;
    };
  },
): Promise<IEcommerceMallOrderItemRefundRequest> {
  const prepared: IEcommerceMallOrderItemRefundRequest.ICreate =
    prepare_random_ecommerce_mall_order_item_refund_request(props.body);
  const result: IEcommerceMallOrderItemRefundRequest =
    await api.functional.ecommerceMall.customer.order_items.refund_requests.create(
      connection,
      {
        orderItemId: props.params.orderItemId,
        body: prepared,
      },
    );
  return result;
}
