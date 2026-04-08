import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_shipments_create } from "../../../generate/generate_random_ecommerce_mall_admin_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_shipment_admin_retrieval_delivered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Authenticate as admin using utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 3. Create a shipment for testing using generator utility
  // Note: We create the shipment first, then retrieve it
  const createdShipment =
    await generate_random_ecommerce_mall_admin_shipments_create(
      adminConnection,
      {
        body: {
          orderItemIds: [
            typia.random<string & tags.Format<"uuid">>(),
          ] satisfies Array<string & tags.Format<"uuid">>,
          carrierName: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 1,
            wordMax: 3,
          }),
          trackingNumber: RandomGenerator.alphaNumeric(20),
        } satisfies DeepPartial<IEcommerceMallShipment.ICreate>,
      },
    );
  typia.assert(createdShipment);
  // 4. Retrieve the shipment by ID using the SDK function
  const retrievedShipment =
    await api.functional.ecommerceMall.admin.shipments.at(adminConnection, {
      shipmentId: createdShipment.id,
    });
  // 5. Validate the response using typia.assert for complete type validation
  typia.assert(retrievedShipment);
  // 6. Validate that the retrieved shipment matches the created one
  TestValidator.equals(
    "shipment id matches",
    retrievedShipment.id,
    createdShipment.id,
  );
  TestValidator.equals(
    "carrier name matches",
    retrievedShipment.carrier_name,
    createdShipment.carrier_name,
  );
  TestValidator.equals(
    "tracking number matches",
    retrievedShipment.tracking_number,
    createdShipment.tracking_number,
  );
  TestValidator.equals(
    "shipped_at matches",
    retrievedShipment.shipped_at,
    createdShipment.shipped_at,
  );
  TestValidator.equals(
    "status matches",
    retrievedShipment.status,
    createdShipment.status,
  );
  TestValidator.equals(
    "seller id matches",
    retrievedShipment.seller.id,
    createdShipment.seller.id,
  );
  // 7. Validate shipment_items array structure
  TestValidator.equals(
    "shipment items count matches",
    retrievedShipment.shipment_items.length,
    createdShipment.shipment_items.length,
  );
  TestValidator.predicate(
    "shipment has valid status",
    retrievedShipment.status === "in_transit" ||
      retrievedShipment.status === "delivered",
  );
  // 8. Validate that shipment_items contain proper nested structures
  for (const item of retrievedShipment.shipment_items) {
    typia.assert(item);
    TestValidator.predicate(
      "shipment item has valid id",
      typeof item.id === "string",
    );
    TestValidator.predicate(
      "shipment item has orderItem",
      item.orderItem !== null,
    );
    TestValidator.predicate(
      "shipment item has createdAt",
      typeof item.createdAt === "string",
    );
  }
}
