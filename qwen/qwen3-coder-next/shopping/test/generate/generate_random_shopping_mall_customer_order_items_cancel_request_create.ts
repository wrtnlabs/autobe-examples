import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_order_cancellation_request } from "../prepare/prepare_random_shopping_mall_order_cancellation_request";

export async function generate_random_shopping_mall_customer_order_items_cancel_request_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IShoppingMallOrderCancellationRequest.ICreate>
      | undefined;
    params: {
      itemId: string;
    };
  },
): Promise<IShoppingMallOrderCancellationRequest> {
  const prepared: IShoppingMallOrderCancellationRequest.ICreate =
    prepare_random_shopping_mall_order_cancellation_request(props.body);
  return await api.functional.shoppingMall.customer.order_items.cancel_request.create(
    connection,
    {
      body: prepared,
      itemId: props.params.itemId,
    },
  );
}
