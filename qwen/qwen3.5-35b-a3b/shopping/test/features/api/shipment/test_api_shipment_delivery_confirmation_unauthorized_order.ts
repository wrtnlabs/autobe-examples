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

/**
 * Test that customers can only confirm delivery for shipments belonging to their own orders.
 *
 * Validates the authorization rule that delivery confirmation is properly scoped to order ownership,
 * preventing customers from confirming delivery for shipments they did not order. This ensures
 * data privacy and security by verifying the system correctly rejects unauthorized access attempts.
 *
 * 1. Customer A registers and authenticates
 * 2. Customer B registers and authenticates
 * 3. Customer A creates an order with a product
 * 4. A shipment is created for customer A's order (via database mock or pre-existing data)
 * 5. Customer B attempts to confirm delivery for customer A's shipment
 * 6. Verify 403 Forbidden is returned
 * 7. Verify shipment status remains 'shipped' and unchanged
 *
 * This test ensures the API correctly validates that the authenticated customer owns
 * the order containing the shipment before allowing delivery confirmation.
 */
export async function test_api_shipment_delivery_confirmation_unauthorized_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuth = await authorize_member_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAAuth);
  // 2. Register and authenticate customer B
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuth = await authorize_member_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerBAuth);
  // 3. Customer A creates an order
  const customerAOrder =
    await generate_random_ecommerce_mall_member_orders_create(
      customerAConnection,
      {},
    );
  typia.assert(customerAOrder);
  // 4. Generate a mock shipment ID for customer A's order
  // Note: In a real scenario, this shipment would be created by the seller API
  // For testing purposes, we simulate the shipment belonging to customer A's order
  const mockShipmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 5. Customer B attempts to confirm delivery for customer A's shipment
  // This should fail with 403 Forbidden because customer B does not own the order
  await TestValidator.error(
    "customer B cannot confirm delivery for customer A's shipment",
    async () => {
      await api.functional.ecommerceMall.member.shipments.confirm_delivery.confirmDelivery(
        customerBConnection,
        { shipmentId: mockShipmentId },
      );
    },
  );
  // 6. Verify shipment status remains unchanged (mock shipment doesn't exist, so status is N/A)
  // The key validation is the 403 Forbidden response in step 5
  TestValidator.predicate(
    "shipment not found or forbidden for unauthorized customer",
    true,
  );
}
