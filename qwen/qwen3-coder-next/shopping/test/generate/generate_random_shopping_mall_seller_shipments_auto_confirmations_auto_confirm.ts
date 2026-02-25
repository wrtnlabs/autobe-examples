import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallDeliveryAutoConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeliveryAutoConfirmation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_delivery_auto_confirmation } from "../prepare/prepare_random_shopping_mall_delivery_auto_confirmation";

export async function generate_random_shopping_mall_seller_shipments_auto_confirmations_auto_confirm(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallDeliveryAutoConfirmation.ICreate>;
    params: {
      shipmentId: string;
    };
  },
): Promise<IShoppingMallDeliveryAutoConfirmation> {
  const prepared: IShoppingMallDeliveryAutoConfirmation.ICreate =
    prepare_random_shopping_mall_delivery_auto_confirmation(props.body);
  return await api.functional.shoppingMall.seller.shipments.auto_confirmations.autoConfirm(
    connection,
    {
      body: prepared,
      shipmentId: props.params.shipmentId,
    },
  );
}
