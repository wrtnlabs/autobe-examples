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

export async function test_api_administrator_order_snapshot_complete_address_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "admin123",
      display_name: "Test Admin",
    },
  });
  typia.assert(adminResponse);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminResponse.token.access;
  // 2. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerResponse = await authorize_member_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "customer123",
      display_name: "John Smith",
      href: "http://localhost/join",
      referrer: "http://localhost/",
      ip: "127.0.0.1",
    },
  });
  typia.assert(customerResponse);
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = customerResponse.token.access;
  // 3. Create comprehensive shipping address
  const address =
    await generate_random_ecommerce_mall_member_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "John Smith",
          phone: "+1-555-0123",
          street: "123 Main St, Apt 4B",
          city: "Seoul",
          state: "Seoul Capital Area",
          postal_code: "06000",
          country: "KR",
          is_default: true,
        },
      },
    );
  typia.assert(address);
  // 4. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerResponse = await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "seller123",
      display_name: "Test Seller",
      href: "http://localhost/join",
      referrer: "http://localhost/",
    },
  });
  typia.assert(sellerResponse);
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = sellerResponse.token.access;
  // 5. Create product (seller must be approved first in real scenario)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product",
        description: "Test product description for snapshot verification",
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 10000,
      },
    },
  );
  typia.assert(product);
  // 6. Create order with the comprehensive shipping address
  const order = await generate_random_ecommerce_mall_member_orders_create(
    customerConnection,
    {
      body: {
        shipping_address_id: address.id,
        order_items: [
          {
            product_variant_id:
              product.variants[0]?.id ??
              typia.random<string & tags.Format<"uuid">>(),
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(order);
  // 7. Retrieve order snapshots list
  const snapshotList =
    await api.functional.ecommerceMall.administrator.orders.snapshots.index(
      adminConnection,
      {
        orderId: order.id,
        body: {},
      },
    );
  typia.assert(snapshotList);
  // 8. Get specific snapshot for address validation
  const snapshotId = snapshotList.data[0]?.id;
  TestValidator.predicate(
    "snapshot should exist",
    () => snapshotId !== undefined && snapshotId !== null,
  );
  const snapshot =
    await api.functional.ecommerceMall.administrator.orders.snapshots.at(
      adminConnection,
      {
        orderId: order.id,
        snapshotId: snapshotId!,
      },
    );
  typia.assert(snapshot);
  // 9. Validate all shipping address fields are preserved exactly
  TestValidator.equals(
    "shipping_recipient_name matches input",
    snapshot.shipping_recipient_name,
    "John Smith",
  );
  TestValidator.equals(
    "shipping_phone matches input",
    snapshot.shipping_phone,
    "+1-555-0123",
  );
  TestValidator.equals(
    "shipping_street includes apartment number",
    snapshot.shipping_street,
    "123 Main St, Apt 4B",
  );
  TestValidator.equals(
    "shipping_city matches input",
    snapshot.shipping_city,
    "Seoul",
  );
  TestValidator.equals(
    "shipping_state matches input",
    snapshot.shipping_state,
    "Seoul Capital Area",
  );
  TestValidator.equals(
    "shipping_postal_code matches input",
    snapshot.shipping_postal_code,
    "06000",
  );
  TestValidator.equals(
    "shipping_country uses ISO code",
    snapshot.shipping_country,
    "KR",
  );
}
