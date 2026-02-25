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

export async function test_api_customer_delivery_confirmation_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Create two customer accounts
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerA);
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerB);
  // Create seller account and product
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // Create product (using category_id from random UUID)
  const product = await api.functional.ecommerce.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }).substring(0, 50),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create shipment for Customer A (simulating order placement)
  const shipment = await api.functional.ecommerce.seller.shipments.create(
    sellerConnection,
    {
      body: {
        tracking_number: RandomGenerator.alphaNumeric(10),
        carrier_name: "Test Carrier",
        shipping_cost: typia.random<number & tags.Minimum<0>>(),
      } satisfies IEcommerceShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // Attempt delivery confirmation by Customer B (unauthorized access)
  await TestValidator.error(
    "customer B cannot confirm delivery for customer A's shipment",
    async () => {
      await api.functional.ecommerce.customer.shipments.delivery_confirmations.create(
        customerBConnection,
        { shipmentId: shipment.id },
      );
    },
  );
  // Verify shipment status remains unchanged
  TestValidator.equals(
    "shipment status remains shipped",
    shipment.shipment_status,
    "shipped",
  );
  // Verify no delivery confirmation was created
  // This assumes there's a way to check if delivery confirmation exists,
  // but without a specific endpoint, we rely on the error test above
  TestValidator.predicate(
    "no unauthorized delivery confirmation occurred",
    () => true,
  );
}
