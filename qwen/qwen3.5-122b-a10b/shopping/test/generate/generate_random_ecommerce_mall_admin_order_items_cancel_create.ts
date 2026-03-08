import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemCancellationRequest";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_order_item_cancellation_request } from "../prepare/prepare_random_ecommerce_mall_order_item_cancellation_request";

export async function generate_random_ecommerce_mall_admin_order_items_cancel_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallOrderItemCancellationRequest.ICreate>;
    params: {
      orderItemId: string;
    };
  },
): Promise<IEcommerceMallOrderItemCancellationRequest> {
  const prepared: IEcommerceMallOrderItemCancellationRequest.ICreate =
    prepare_random_ecommerce_mall_order_item_cancellation_request(props.body);
  const result: IEcommerceMallOrderItemCancellationRequest =
    await api.functional.ecommerceMall.admin.order_items.cancel.create(
      connection,
      {
        orderItemId: props.params.orderItemId,
        body: prepared,
      },
    );
  return result;
}
