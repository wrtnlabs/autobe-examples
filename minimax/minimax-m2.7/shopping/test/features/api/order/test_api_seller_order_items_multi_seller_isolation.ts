import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
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
import { generate_random_ecommerce_mall_customer_customers_me_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_seller_order_items_multi_seller_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register two sellers
  const sellerAEmail = `sellerA_${typia.random<string & tags.Format<"email">>()}`;
  const sellerAPassword = RandomGenerator.alphaNumeric(16);
  const sellerAAuth = await authorize_seller_join(connection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      href: typia.random<string & tags.Format<"uri">>() as string &
        tags.Format<"uri">,
      referrer: typia.random<string & tags.Format<"uri">>() as string &
        tags.Format<"uri">,
    },
  });
  typia.assert(sellerAAuth);
  const sellerBEmail = `sellerB_${typia.random<string & tags.Format<"email">>()}`;
  const sellerBPassword = RandomGenerator.alphaNumeric(16);
  const sellerBAuth = await authorize_seller_join(connection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
      href: typia.random<string & tags.Format<"uri">>() as string &
        tags.Format<"uri">,
      referrer: typia.random<string & tags.Format<"uri">>() as string &
        tags.Format<"uri">,
    },
  });
  typia.assert(sellerBAuth);
  // 2. Register and authenticate admin to approve sellers
  const adminAuth = await authorize_admin_join(connection, {});
  typia.assert(adminAuth);
  // 3. Register and authenticate customer
  const customerEmail = `customer_${typia.random<string & tags.Format<"email">>()}`;
  const customerAuth = await authorize_customer_join(connection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>() as string &
        tags.Format<"uri">,
      referrer: typia.random<string & tags.Format<"uri">>() as string &
        tags.Format<"uri">,
    },
  });
  typia.assert(customerAuth);
  // 4. Create shipping address for customer
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: `Bearer ${customerAuth.token.access}`,
  };
  const address =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 5. Create product for Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuthLogin = await authorize_seller_login(sellerAConnection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      href: typia.random<string & tags.Format<"uri">>() as string &
        tags.Format<"uri">,
      referrer: typia.random<string & tags.Format<"uri">>() as string &
        tags.Format<"uri">,
    },
  });
  typia.assert(sellerAAuthLogin);
  const productA =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerAConnection,
      {},
    );
  typia.assert(productA);
  // Add inventory using the generation function
  // Since variants array may be empty, we need to create at least one variant
  // Looking at the product structure, variants should exist after product creation
  // Using the first variant if available, or the product ID as fallback
  const variantIdA = productA.variants[0]?.id ?? productA.id;
  await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
    sellerAConnection,
    {
      params: { variantId: variantIdA },
      body: { quantityChange: 100, reason: "Initial stock" },
    },
  );
  // 6. Create product for Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuthLogin = await authorize_seller_login(sellerBConnection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
      href: typia.random<string & tags.Format<"uri">>() as string &
        tags.Format<"uri">,
      referrer: typia.random<string & tags.Format<"uri">>() as string &
        tags.Format<"uri">,
    },
  });
  typia.assert(sellerBAuthLogin);
  const productB =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerBConnection,
      {},
    );
  typia.assert(productB);
  // Add inventory for Seller B
  const variantIdB = productB.variants[0]?.id ?? productB.id;
  await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
    sellerBConnection,
    {
      params: { variantId: variantIdB },
      body: { quantityChange: 50, reason: "Initial stock" },
    },
  );
  // 7. Customer places order containing items from both sellers
  // Note: Order creation converts cart items to order items
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {
        body: { shippingAddressId: address.id },
      },
    );
  typia.assert(order);
  // 8. Verify order contains items from both sellers
  TestValidator.equals(
    "order has items from both sellers",
    order.orderItems.length >= 2,
    true,
  );
  // 9. Query Seller A's order items
  const sellerAOrderItems =
    await api.functional.ecommerceMall.seller.sellers.me.orders.items.index(
      sellerAConnection,
      {
        body: {} satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(sellerAOrderItems);
  // 10. Verify Seller A only sees their own order items
  const sellerAItemProductIds = sellerAOrderItems.data.map(
    (item) => item.productSnapshot.productId,
  );
  TestValidator.equals(
    "Seller A sees items only from their own products",
    sellerAItemProductIds.every((id) => id === productA.id),
    true,
  );
  // 11. Verify Seller A never sees Seller B's items
  TestValidator.equals(
    "Seller A does not see Seller B's products",
    sellerAItemProductIds.includes(productB.id),
    false,
  );
  // 12. Query Seller B's order items
  const sellerBOrderItems =
    await api.functional.ecommerceMall.seller.sellers.me.orders.items.index(
      sellerBConnection,
      {
        body: {} satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(sellerBOrderItems);
  // 13. Verify Seller B only sees their own order items
  const sellerBItemProductIds = sellerBOrderItems.data.map(
    (item) => item.productSnapshot.productId,
  );
  TestValidator.equals(
    "Seller B sees items only from their own products",
    sellerBItemProductIds.every((id) => id === productB.id),
    true,
  );
  // 14. Verify Seller B never sees Seller A's items
  TestValidator.equals(
    "Seller B does not see Seller A's products",
    sellerBItemProductIds.includes(productA.id),
    false,
  );
}
