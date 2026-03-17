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

export async function generate_random_ecommerce_mall_admin_order_items_refund_request_refund(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallOrderItemRefundRequest.ICreate>;
    params?: {
      orderItemId: string;
    };
  },
): Promise<IEcommerceMallOrderItemRefundRequest> {
  const prepared: IEcommerceMallOrderItemRefundRequest.ICreate =
    prepare_random_ecommerce_mall_order_item_refund_request(props.body);
  const result: IEcommerceMallOrderItemRefundRequest =
    await api.functional.ecommerceMall.admin.order_items.refund.requestRefund(
      connection,
      {
        orderItemId: typia.assert<string & tags.Format<"uuid">>(props.params?.orderItemId ?? "00000000-0000-0000-0000-000000000000"),
        body: prepared,
      },
    );
  return result;
}