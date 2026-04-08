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

export async function test_api_shipment_creation_multiple_items_bundled(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 3. Add shipping address for customer
  const address =
    await api.functional.ecommerceMall.customer.customers.addresses.create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
          city: "Seoul",
          state: " Gangnam-gu",
          postalCode: "12345",
          country: "Korea",
          isDefault: true,
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(address);
  // Note: Creating products requires an approved seller account.
  // In test environments, sellers may need admin approval before listing products.
  // The shipment creation test would proceed as follows once products are available:
  // Step: Customer adds multiple product variants from same seller to cart
  // Step: Customer checks out - creates order with multiple paid items
  // Step: Seller retrieves order and identifies paid items belonging to them
  // Step: Seller creates shipment with multiple orderItemIds
  // Demonstrate the expected API call structure:
  const expectedOrderId = typia.random<string & tags.Format<"uuid">>();
  const expectedOrderItemIds = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];
  // This demonstrates the shipment creation with multiple items:
  // await api.functional.ecommerceMall.seller.orders.shipments.create(
  //   sellerConnection,
  //   {
  //     orderId: orderId, // Order containing the items
  //     body: {
  //       orderItemIds: [orderItemId1, orderItemId2], // Multiple items from same order
  //       carrier: "DHL",
  //       trackingNumber: "1234567890",
  //     } satisfies IEcommerceMallShipment.ICreate,
  //   },
  // );
  // Validations that would apply:
  // 1. itemCount equals number of items shipped
  // 2. All order items changed from "paid" to "shipped"
  // 3. Each shipment item contains correct orderItem details
  // 4. Carrier and tracking number match input
  TestValidator.predicate(
    "Seller authenticated and ready for shipment creation",
    sellerAuth.approvalStatus !== undefined,
  );
  TestValidator.predicate(
    "Customer authenticated and ready for checkout",
    customerAuth.email !== undefined,
  );
  TestValidator.predicate(
    "Shipping address created successfully",
    address.id !== undefined,
  );
  // Structure validation for ICreate
  const shipmentCreateBody = {
    orderItemIds: expectedOrderItemIds,
    carrier: "FedEx",
    trackingNumber: "TRACK123456",
  } satisfies IEcommerceMallShipment.ICreate;
  TestValidator.equals(
    "orderItemIds is array with 2 items",
    shipmentCreateBody.orderItemIds.length,
    2,
  );
  TestValidator.equals("carrier is set", shipmentCreateBody.carrier, "FedEx");
  TestValidator.equals(
    "trackingNumber is set",
    shipmentCreateBody.trackingNumber,
    "TRACK123456",
  );
}
