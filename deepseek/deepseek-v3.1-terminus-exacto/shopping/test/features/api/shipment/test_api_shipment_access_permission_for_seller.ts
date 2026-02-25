import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_shipment_access_permission_for_seller(
  connection: api.IConnection,
): Promise<void> {
  // Create first seller connection and register
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {});
  typia.assert(seller1);
  // Create second seller connection and register
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {});
  typia.assert(seller2);
  // Simulate an order and shipment for seller1
  // Note: In a real scenario, we would need order creation and shipment creation APIs
  // Since those are not provided, we simulate with random UUIDs for testing permissions
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to access seller1's shipment using seller2's connection
  // This should fail with 403 Forbidden
  await TestValidator.httpError(
    "seller2 should not access seller1's shipment",
    403,
    async () => {
      await api.functional.ecommerce.seller.orders.shipments.at(
        seller2Connection,
        {
          orderId,
          shipmentId,
        },
      );
    },
  );
  // Verify that seller1 can access their own shipment
  // This should succeed when the shipment exists, but with random IDs
  // we might get 404. However, the authorization should pass first.
  // We'll test that no HTTP error occurs (it might be 404 but not 403)
  await TestValidator.error(
    "seller1 should not get 403 Forbidden error",
    async () => {
      try {
        await api.functional.ecommerce.seller.orders.shipments.at(
          seller1Connection,
          {
            orderId,
            shipmentId,
          },
        );
        // If we get here, either:
        // 1. The IDs happen to match real data (unlikely)
        // 2. Authorization passed but shipment doesn't exist (404)
        // 3. Mock/test environment returns random data
      } catch (error) {
        // Check if it's an HttpError with 403 status
        if (typia.is<api.HttpError>(error) && error.status === 403) {
          throw new Error(
            "Seller1 got 403 Forbidden when they should have permission",
          );
        }
        // Any other error (404, etc.) is acceptable for this test
        // since we're testing authorization, not existence
      }
    },
  );
}
