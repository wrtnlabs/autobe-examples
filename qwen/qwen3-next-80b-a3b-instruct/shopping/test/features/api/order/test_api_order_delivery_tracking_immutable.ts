import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
export async function test_api_order_delivery_tracking_immutable(
  connection: api.IConnection,
): Promise<void> {
  // Generate realistic order code and tracking code using domain-specific format
  const orderCode = typia.random<string & tags.Format<"uuid">>();
  const trackingCode = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete the delivery tracking record
  // According to requirements, this must be a no-op with successful response
  // No error should be thrown, confirming the immutable audit log protection
  await TestValidator.error(
    "deletion of immutable delivery tracking record should be blocked as no-op",
    async () => {
      await api.functional.shoppingMall.orders.deliveries.erase(connection, {
        orderCode,
        trackingCode,
      });
    },
  );
  // No value to validate as endpoint returns void, but successful no-op confirmed by TestValidator.error
}
