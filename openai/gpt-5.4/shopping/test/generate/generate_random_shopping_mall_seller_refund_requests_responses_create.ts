import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_refund_request_snapshot } from "../prepare/prepare_random_shopping_mall_refund_request_snapshot";

export async function generate_random_shopping_mall_seller_refund_requests_responses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallRefundRequestSnapshot.ICreate> | undefined;
    params: {
      refundRequestId: string;
    };
  },
): Promise<IShoppingMallRefundRequest> {
  const prepared: IShoppingMallRefundRequestSnapshot.ICreate =
    prepare_random_shopping_mall_refund_request_snapshot(props.body);
  const result: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.responses.create(
      connection,
      {
        refundRequestId: props.params.refundRequestId,
        body: prepared,
      },
    );
  return result;
}
