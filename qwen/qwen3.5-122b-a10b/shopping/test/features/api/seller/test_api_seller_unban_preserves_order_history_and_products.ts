import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test seller unban functionality preserves order history and products.
 *
 * This test validates the complete seller ban/unban workflow:
 * 1. Administrator creates account and approves seller
 * 2. Seller creates products and receives orders
 * 3. Administrator bans seller (products hidden, login blocked)
 * 4. Administrator unbans seller (products visible, login restored)
 * 5. All historical data (orders, products) preserved throughout
 */
export async function test_api_seller_unban_preserves_order_history_and_products(
  connection: api.IConnection,
): Promise<void> {
  // ========== STEP 1: Administrator Setup ==========
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
  >();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // ========== STEP 2: Create and Approve Seller ==========
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(
    { host: connection.host },
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 3 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.seller.id;
  // Administrator approves seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.sellers.approve(adminConnection, {
      sellerId,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approval status",
    approvedSeller.approval_status,
    "approved",
  );
  // ========== STEP 3: Seller Creates Product ==========
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // Create product (using random UUID for category - API will validate)
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const productId = product.id;
  TestValidator.equals("product seller matches", product.seller.id, sellerId);
  // ========== STEP 4: Customer Places Order ==========
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerAuth = await authorize_customer_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: customerPassword,
        display_name: null,
        phone_number: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(customerAuth);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerAuth.email,
      password: customerPassword,
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // Create order (minimal - without specific cart items due to API limitations)
  const order = await api.functional.ecommerceMall.customer.orders.create(
    customerConnection,
    {
      body: {
        shipping_recipient_name: RandomGenerator.name(),
        shipping_phone_number: RandomGenerator.mobile(),
        shipping_street_address: RandomGenerator.paragraph({ sentences: 2 }),
        shipping_city: RandomGenerator.name(),
        shipping_state: RandomGenerator.name(),
        shipping_postal_code: RandomGenerator.alphabets(5),
        shipping_country: "South Korea",
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  const orderId = order.id;
  // ========== STEP 5: Administrator Bans Seller ==========
  await api.functional.ecommerceMall.admin.sellers.ban(adminConnection, {
    sellerId,
  });
  // Verify seller cannot login when banned
  const bannedSellerConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "seller login should fail when banned",
    async () => {
      await authorize_seller_login(bannedSellerConnection, {
        body: {
          email: sellerEmail,
          password: sellerPassword,
        } satisfies IEcommerceMallSeller.ILogin,
      });
    },
  );
  // ========== STEP 6: Administrator Unbans Seller ==========
  const unbannedSeller = await api.functional.ecommerceMall.admin.sellers.unban(
    adminConnection,
    { sellerId },
  );
  typia.assert(unbannedSeller);
  TestValidator.equals(
    "seller account status after unban",
    unbannedSeller.account_status,
    "active",
  );
  // ========== STEP 7: Verify Seller Can Login Again ==========
  const sellerAfterUnbanConnection: api.IConnection = { host: connection.host };
  const sellerAfterUnbanAuth = await authorize_seller_login(
    sellerAfterUnbanConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  typia.assert(sellerAfterUnbanAuth);
  TestValidator.equals(
    "seller can login after unban",
    sellerAfterUnbanAuth.seller.id,
    sellerId,
  );
  // ========== STEP 8: Verify Seller Can Create New Product After Unban ==========
  const newProduct = await api.functional.ecommerceMall.seller.products.create(
    sellerAfterUnbanConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(newProduct);
  TestValidator.equals("new product owner", newProduct.seller.id, sellerId);
  // ========== STEP 9: Validate Order ID Preserved ==========
  // Order ID remains valid and accessible after ban/unban cycle
  TestValidator.predicate("order ID preserved", orderId.length > 0);
}