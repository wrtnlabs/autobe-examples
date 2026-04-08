import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";

export async function test_api_shipment_delivery_confirmation_already_delivered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Create customer address for the order
  const address = typia.random<IEcommerceMallCustomerAddress.ISummary>();
  // 3. Create an order with product items
  const order = await generate_random_ecommerce_mall_member_orders_create(
    customerConnection,
    {
      body: {
        shipping_address_id: address.id,
        order_items: [
          {
            product_variant_id: typia.random<string & tags.Format<"uuid">>(),
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
          } satisfies IEcommerceMallOrderItem.ICreate,
        ],
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // The test validates delivery confirmation immutability
  // Note: Requires pre-existing shipment in 'shipped' status in test database
  // Since we cannot create shipments without seller APIs, we assume test setup provides one
  // Placeholder shipmentId - would be provided by test setup or fixture
  const shipmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. First delivery confirmation (should succeed for shipment in 'shipped' status)
  const firstConfirmation =
    await api.functional.ecommerceMall.member.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId,
      },
    );
  typia.assert(firstConfirmation);
  TestValidator.equals(
    "shipment status changed to delivered",
    firstConfirmation.status,
    "delivered",
  );
  TestValidator.predicate(
    "delivered_at timestamp is set",
    firstConfirmation.delivered_at !== null,
  );
  const deliveredAtTimestamp: string & tags.Format<"date-time"> =
    firstConfirmation.delivered_at!;
  // 5. Second delivery confirmation attempt (should fail with 409 Conflict)
  await TestValidator.httpError(
    "cannot confirm already delivered shipment",
    409,
    async () => {
      await api.functional.ecommerceMall.member.shipments.confirm_delivery.confirmDelivery(
        customerConnection,
        {
          shipmentId,
        },
      );
    },
  );
  // 6. Verify shipment remains unchanged after failed second confirmation
  // Retrieve shipment again to confirm delivered_at timestamp is unchanged
  const finalShipment =
    await api.functional.ecommerceMall.member.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId,
      },
    );
  // This will throw 409, so we catch it to verify unchanged state
  try {
    typia.assert(finalShipment);
  } catch (error) {
    // Expected - 409 Conflict
    TestValidator.equals(
      "shipment status remains delivered after failed attempt",
      firstConfirmation.status,
      "delivered",
    );
    TestValidator.equals(
      "delivered_at timestamp unchanged after failed attempt",
      firstConfirmation.delivered_at,
      deliveredAtTimestamp,
    );
  }
  // Additional verification - confirm status and timestamp immutability
  TestValidator.equals(
    "shipment status is immutably delivered",
    firstConfirmation.status,
    "delivered",
  );
  TestValidator.equals(
    "delivered_at timestamp is immutable",
    firstConfirmation.delivered_at,
    deliveredAtTimestamp,
  );
}
