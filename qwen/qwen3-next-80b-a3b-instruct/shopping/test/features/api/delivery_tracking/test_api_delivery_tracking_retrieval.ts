import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallDeliveryEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeliveryEvent";
import type { IShoppingMallDeliveryTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeliveryTracking";
export async function test_api_delivery_tracking_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random order code for testing
  const orderCode = typia.random<string>();
  // Call the API to retrieve delivery tracking information
  const deliveryTracking: IShoppingMallDeliveryTracking.IInvert =
    await api.functional.shoppingMall.orders.deliveries.index(connection, {
      orderCode,
    });
  // Validate the response matches the expected schema
  typia.assert(deliveryTracking);
  // Verify that the returned order code matches the requested order code
  TestValidator.equals(
    "order code matches",
    deliveryTracking.order_code,
    orderCode,
  );
}
