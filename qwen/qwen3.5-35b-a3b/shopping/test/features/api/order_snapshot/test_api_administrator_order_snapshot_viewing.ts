import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_member_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_member_customer_addresses_create";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_administrator_order_snapshot_viewing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234Admin!",
      grade: "regular",
    },
  });
  // 2. Customer setup and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234Customer!",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuth);
  // 3. Seller setup and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234Seller!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 4. Customer creates shipping address
  const customerAddress =
    await generate_random_ecommerce_mall_member_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(2),
          state: RandomGenerator.name(2),
          postal_code: typia.random<string>(),
          country: "South Korea",
          is_default: true,
        },
      },
    );
  typia.assert(customerAddress);
  // 5. Seller creates product (requires valid category - using a known category)
  const testCategory: string & tags.Format<"uuid"> =
    "00000000-0000-0000-0000-000000000000" as any;
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        category_id: testCategory,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 6. Customer places order
  const order = await generate_random_ecommerce_mall_member_orders_create(
    customerConnection,
    {
      body: {
        shipping_address_id: customerAddress.id,
        order_items: [
          {
            product_variant_id:
              product.variants[0]?.id ?? "00000000-0000-0000-0000-000000000000", // Fallback for no variants
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(order);
  // 7. Retrieve order snapshots to get snapshotId
  const snapshotList =
    await api.functional.ecommerceMall.administrator.orders.snapshots.index(
      adminConnection,
      {
        orderId: order.id,
        body: { limit: 10 },
      },
    );
  typia.assert(snapshotList);
  TestValidator.predicate("has snapshots", snapshotList.data.length > 0);
  const snapshot = snapshotList.data[0];
  const snapshotId = snapshot.id;
  const orderId = order.id;
  // 8. Call GET endpoint to retrieve specific snapshot
  const retrievedSnapshot =
    await api.functional.ecommerceMall.administrator.orders.snapshots.at(
      adminConnection,
      {
        orderId: orderId,
        snapshotId: snapshotId,
      },
    );
  typia.assert(retrievedSnapshot);
  // 9. Validate snapshot response
  TestValidator.equals("snapshot id matches", retrievedSnapshot.id, snapshotId);
  TestValidator.equals(
    "order id matches",
    retrievedSnapshot.order.id,
    orderId,
  );
  TestValidator.equals(
    "order number matches",
    retrievedSnapshot.order_number,
    order.order_number,
  );
  TestValidator.equals(
    "item count matches",
    retrievedSnapshot.item_count,
    order.items.length,
  );
  TestValidator.equals(
    "total amount matches",
    retrievedSnapshot.total_amount,
    order.total_price,
  );
  TestValidator.equals(
    "customer name matches",
    retrievedSnapshot.customer_name,
    customerAuth.display_name ?? "",
  );
  TestValidator.equals(
    "customer phone matches",
    retrievedSnapshot.customer_phone,
    customerAuth.phone_number ?? "",
  );
  TestValidator.equals(
    "shipping recipient matches",
    retrievedSnapshot.shipping_recipient_name,
    customerAddress.recipient_name,
  );
  TestValidator.equals(
    "shipping phone matches",
    retrievedSnapshot.shipping_phone,
    customerAddress.phone,
  );
  TestValidator.equals(
    "shipping street matches",
    retrievedSnapshot.shipping_street,
    customerAddress.street,
  );
  TestValidator.equals(
    "shipping city matches",
    retrievedSnapshot.shipping_city,
    customerAddress.city,
  );
  TestValidator.equals(
    "shipping state matches",
    retrievedSnapshot.shipping_state,
    customerAddress.state,
  );
  TestValidator.equals(
    "shipping postal code matches",
    retrievedSnapshot.shipping_postal_code,
    customerAddress.postal_code,
  );
  TestValidator.equals(
    "shipping country matches",
    retrievedSnapshot.shipping_country,
    customerAddress.country,
  );
  TestValidator.equals(
    "order status matches",
    retrievedSnapshot.order_status,
    order.status,
  );
  // Verify order summary in response
  typia.assert(retrievedSnapshot.order);
  TestValidator.equals(
    "order summary id matches",
    retrievedSnapshot.order.id,
    orderId,
  );
  TestValidator.equals(
    "order summary order number matches",
    retrievedSnapshot.order.order_number,
    order.order_number,
  );
  TestValidator.equals(
    "order summary status matches",
    retrievedSnapshot.order.status,
    order.status,
  );
  TestValidator.equals(
    "order summary total price matches",
    retrievedSnapshot.order.total_price,
    order.total_price,
  );
}