import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceDeliveryConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDeliveryConfirmation";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
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
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_shipments_create } from "../../../generate/generate_random_ecommerce_seller_shipments_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_shipment } from "../../../prepare/prepare_random_ecommerce_shipment";

export async function test_api_customer_delivery_confirmation_manual_success(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // Create product as seller
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // Customer creates order (simulated - this would normally involve cart creation and checkout)
  // For this test, we'll simulate the order creation and assume shipment is created for paid items
  // Seller creates shipment for the customer's order
  const shipment = await generate_random_ecommerce_seller_shipments_create(
    sellerConnection,
    {
      body: {
        tracking_number: RandomGenerator.alphaNumeric(12),
        carrier_name: RandomGenerator.pick(["UPS", "FedEx", "USPS", "DHL"]),
        shipping_cost: typia.random<number & tags.Minimum<0>>(),
      } satisfies IEcommerceShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // Customer confirms delivery
  const deliveryConfirmation =
    await api.functional.ecommerce.customer.shipments.delivery_confirmations.create(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(deliveryConfirmation);
  // Validate delivery confirmation record
  TestValidator.equals(
    "delivery confirmation id exists",
    typeof deliveryConfirmation.id,
    "string",
  );
  TestValidator.equals(
    "confirmed_at timestamp exists",
    typeof deliveryConfirmation.confirmed_at,
    "string",
  );
  TestValidator.equals(
    "created_at timestamp exists",
    typeof deliveryConfirmation.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at timestamp exists",
    typeof deliveryConfirmation.updated_at,
    "string",
  );
  // Validate shipment association
  TestValidator.equals(
    "shipment id matches",
    deliveryConfirmation.shipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "shipment tracking number matches",
    deliveryConfirmation.shipment.tracking_number,
    shipment.tracking_number,
  );
  TestValidator.equals(
    "shipment carrier name matches",
    deliveryConfirmation.shipment.carrier_name,
    shipment.carrier_name,
  );
  TestValidator.equals(
    "shipment status is delivered",
    deliveryConfirmation.shipment.shipment_status,
    "delivered",
  );
  // Validate customer association
  TestValidator.equals(
    "customer id matches",
    deliveryConfirmation.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email matches",
    deliveryConfirmation.customer.email,
    customer.email,
  );
  TestValidator.equals(
    "customer display name matches",
    deliveryConfirmation.customer.display_name,
    customer.display_name,
  );
  TestValidator.equals(
    "customer phone number matches",
    deliveryConfirmation.customer.phone_number,
    customer.phone_number,
  );
  // Validate timestamps
  TestValidator.predicate(
    "confirmed_at is valid ISO date",
    () => !isNaN(new Date(deliveryConfirmation.confirmed_at).getTime()),
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    () => !isNaN(new Date(deliveryConfirmation.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    () => !isNaN(new Date(deliveryConfirmation.updated_at).getTime()),
  );
  // Validate that delivered_at timestamp is set on the shipment
  TestValidator.predicate(
    "shipment delivered_at is set",
    () =>
      deliveryConfirmation.shipment.delivered_at !== null &&
      deliveryConfirmation.shipment.delivered_at !== undefined,
  );
  // Validate date relationships
  const confirmedAt = new Date(deliveryConfirmation.confirmed_at);
  const createdAt = new Date(deliveryConfirmation.created_at);
  const updatedAt = new Date(deliveryConfirmation.updated_at);
  const shippedAt = deliveryConfirmation.shipment.shipped_at
    ? new Date(deliveryConfirmation.shipment.shipped_at)
    : null;
  const deliveredAt = deliveryConfirmation.shipment.delivered_at
    ? new Date(deliveryConfirmation.shipment.delivered_at)
    : null;
  if (shippedAt) {
    TestValidator.predicate(
      "delivery confirmed after shipment",
      () => confirmedAt >= shippedAt,
    );
  }
  if (deliveredAt) {
    TestValidator.predicate(
      "delivered_at matches confirmed_at",
      () => deliveredAt.getTime() === confirmedAt.getTime(),
    );
  }
  // Validate logical sequence
  TestValidator.predicate(
    "created_at is before or equal to updated_at",
    () => createdAt <= updatedAt,
  );
  TestValidator.predicate(
    "confirmed_at is after or equal to created_at",
    () => confirmedAt >= createdAt,
  );
}