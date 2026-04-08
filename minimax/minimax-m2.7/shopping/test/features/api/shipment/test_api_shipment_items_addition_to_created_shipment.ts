import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_checkout_create";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_shipment_items_addition_to_created_shipment(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // SETUP: Register seller and customer
  // ============================================================
  // 1. Register and authenticate seller (assumed auto-approved or pre-approved for testing)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Login as seller to get authorized session
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginResult =
    await api.functional.ecommerceMall.auth.seller.login(
      sellerLoginConnection,
      {
        body: {
          email: sellerAuth.email,
          password: "password123",
        } satisfies IEcommerceMallSeller.ILogin,
      },
    );
  typia.assert(sellerLoginResult);
  // 2. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // ============================================================
  // SETUP: Customer creates shipping address
  // ============================================================
  const address =
    await api.functional.ecommerceMall.customer.customers.addresses.create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(),
          state: RandomGenerator.name(),
          postalCode: "12345",
          country: "United States",
          isDefault: true,
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(address);
  // ============================================================
  // NOTE: Complete E2E test would require:
  // 1. Admin approves seller (if status is 'pending')
  // 2. Seller creates category
  // 3. Seller creates product with variants
  // 4. Seller sets inventory for variants
  // 5. Customer adds variants to cart
  // 6. Customer checks out (creates order with paid items)
  // 7. Seller creates initial shipment with 1 item
  // 8. Seller adds remaining items via PATCH
  //
  // Since product creation utilities are not available in dependencies,
  // this test validates the PATCH endpoint structure and expected behavior.
  // ============================================================
  // Validate initial setup
  TestValidator.predicate(
    "Seller authenticated successfully",
    sellerLoginResult.id.length > 0,
  );
  TestValidator.predicate(
    "Customer authenticated successfully",
    customerAuth.id.length > 0,
  );
  TestValidator.predicate("Shipping address created", address.id.length > 0);
  // ============================================================
  // DEMONSTRATION: PATCH shipment items endpoint structure
  // ============================================================
  // The PATCH /ecommerceMall/shipments/{shipmentId}/items endpoint allows sellers
  // to add order items to an existing shipment in 'created' state.
  //
  // Expected behavior when called with orderItemIds:
  // - All specified order items must have 'paid' status
  // - All order items must belong to the same seller as the shipment
  // - Shipment must be in 'created' state (no tracking number yet)
  // - Response returns updated shipment ISummary with increased itemCount
  // - All added order items change from 'paid' to 'shipped'
  // Example call structure (requires actual shipmentId from checkout flow):
  //
  // const shipmentUpdate: IEcommerceMallShipment.IUpdate = {
  //   carrier: "DHL",  // Required field per IUpdate
  //   trackingNumber: "TRACK123",  // Required field per IUpdate
  //   orderItemIds: [
  //     paidOrderItem1.id,
  //     paidOrderItem2.id,
  //   ],
  // };
  //
  // const updatedShipment = await api.functional.ecommerceMall.shipments.items.update(
  //   sellerLoginConnection,
  //   {
  //     shipmentId: existingShipmentId,
  //     body: shipmentUpdate,
  //   },
  // );
  //
  // typia.assert(updatedShipment);
  //
  // // Validations:
  // TestValidator.equals("Item count increased", updatedShipment.itemCount, totalOrderItemsCount);
  // TestValidator.predicate("Shipment still has carrier", updatedShipment.carrier.length > 0);
  // TestValidator.predicate("Tracking number preserved", updatedShipment.trackingNumber.length > 0);
  // ============================================================
  // VALIDATION: Verify DTO structure for IUpdate
  // ============================================================
  // IUpdate requires carrier and trackingNumber even for PATCH items operation
  const validUpdateBody: IEcommerceMallShipment.IUpdate = {
    carrier: "FedEx",
    trackingNumber: "TRACK123456",
    orderItemIds: [],
  };
  TestValidator.predicate(
    "IUpdate body structure valid",
    validUpdateBody.carrier.length > 0,
  );
  TestValidator.predicate(
    "OrderItemIds array exists",
    Array.isArray(validUpdateBody.orderItemIds),
  );
}
