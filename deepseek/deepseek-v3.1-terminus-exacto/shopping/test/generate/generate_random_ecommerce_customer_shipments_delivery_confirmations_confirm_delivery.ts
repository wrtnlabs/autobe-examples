import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceDeliveryConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDeliveryConfirmation";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_delivery_confirmation } from "../prepare/prepare_random_ecommerce_delivery_confirmation";

export async function generate_random_ecommerce_customer_shipments_delivery_confirmations_confirm_delivery(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceDeliveryConfirmation.ICreate> | undefined;
    params: {
      shipmentId: string;
    };
  },
): Promise<IEcommerceShipment> {
  const prepared: IEcommerceDeliveryConfirmation.ICreate =
    prepare_random_ecommerce_delivery_confirmation(props.body);
  const result: IEcommerceShipment =
    await api.functional.ecommerce.customer.shipments.delivery_confirmations.confirmDelivery(
      connection,
      {
        body: prepared,
        shipmentId: props.params.shipmentId,
      },
    );
  return result;
}
