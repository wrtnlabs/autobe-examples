import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCoordinates } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoordinates";
import type { IShoppingMallDeliveryEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeliveryEvent";
import { prepare_random_shopping_mall_delivery_event } from "../prepare/prepare_random_shopping_mall_delivery_event";
export async function generate_random_shopping_mall_delivery_events_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallDeliveryEvent.ICreate> | undefined;
  },
): Promise<IShoppingMallDeliveryEvent> {
  const prepared: IShoppingMallDeliveryEvent.ICreate =
    prepare_random_shopping_mall_delivery_event(props.body);
  return await api.functional.shoppingMall.delivery_events.create(connection, {
    body: prepared,
  });
}
