import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
export async function test_api_shipping_tracking_deletion_disabled(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid shipping tracking ID
  const shippingTrackingId = typia.random<string & tags.Format<"uuid">>();
  // Test deletion attempt by any user (should fail with 404 or 403)
  await TestValidator.error(
    "shipping tracking deletion should be disabled for all actors",
    async () => {
      await api.functional.shoppingMall.shipping_trackings.erase(connection, {
        shippingTrackingId,
      });
    },
  );
}
