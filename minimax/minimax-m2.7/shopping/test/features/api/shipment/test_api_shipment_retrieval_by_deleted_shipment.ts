import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test that a soft-deleted shipment cannot be retrieved by its ID.
 *
 * Validates the soft-delete protection mechanism for shipment retrieval. When a seller creates a shipment and then soft-deletes it (by setting deleted_at timestamp), attempting to retrieve that shipment via the GET endpoint should return a 404 Not Found error. This ensures that deleted shipments are properly excluded from access even though their records are preserved in the database for audit purposes.
 *
 * 1. Seller registers and authenticates via seller join endpoint.
 * 2. A shipment is created with carrier and tracking information.
 * 3. The shipment is soft-deleted via the DELETE endpoint.
 * 4. Attempting to retrieve the deleted shipment returns 404 error.
 * 5. Validates that the soft-delete filter (deleted_at IS NULL) is correctly applied.
 */
export async function test_api_shipment_retrieval_by_deleted_shipment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create a shipment using the generation function
  const shipment =
    await generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create(
      sellerConnection,
      {
        params: {
          itemId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(shipment);
  // 3. Soft-delete the shipment
  await api.functional.ecommerceMall.seller.shipments.erase(sellerConnection, {
    shipmentId: shipment.id,
  });
  // 4. Attempt to retrieve the deleted shipment - should return 404
  await TestValidator.httpError("deleted shipment not accessible", 404, () =>
    api.functional.ecommerceMall.seller.sellers.me.shipments.at(
      sellerConnection,
      {
        shipmentId: shipment.id,
      },
    ),
  );
}
