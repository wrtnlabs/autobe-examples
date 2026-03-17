import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_shipment } from "../prepare/prepare_random_ecommerce_mall_shipment";

export async function generate_random_ecommerce_mall_seller_shipments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallShipment.ICreate> | undefined;
  },
): Promise<IEcommerceMallShipment> {
  const prepared: IEcommerceMallShipment.ICreate =
    prepare_random_ecommerce_mall_shipment(props.body);
  return await api.functional.ecommerceMall.seller.shipments.create(
    connection,
    {
      body: prepared,
    },
  );
}
