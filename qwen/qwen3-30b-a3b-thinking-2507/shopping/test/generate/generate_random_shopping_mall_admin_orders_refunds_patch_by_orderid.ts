import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_refund_request } from "../prepare/prepare_random_shopping_mall_refund_request";

export async function generate_random_shopping_mall_admin_orders_refunds_patch_by_orderid(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallRefundRequest.ICreate> | undefined;
    params: {
      orderId: string;
    };
  },
): Promise<IShoppingMallRefundRequest> {
  const prepared = prepare_random_shopping_mall_refund_request(props.body);
  return await api.functional.shoppingMall.admin.orders.refunds.patchByOrderid(
    connection,
    {
      orderId: props.params.orderId,
      body: prepared,
    },
  );
}
