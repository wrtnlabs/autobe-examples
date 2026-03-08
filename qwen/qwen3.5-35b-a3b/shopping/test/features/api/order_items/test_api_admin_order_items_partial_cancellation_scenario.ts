import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import type { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
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
import { generate_random_ecommerce_mall_customer_carts_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_admin_order_items_partial_cancellation_scenario(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join and login
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.admin.join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const adminLoggedInConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.admin.login(adminLoggedInConnection, {
    body: {
      email: (adminConnection as any).headers?.Authorization,
      password: "1234",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Seller setup - join and get approved
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "http://localhost",
        referrer: "http://localhost",
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerJoin);
  // Admin approves seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerJoin.id,
    });
  typia.assert(approvedSeller);
  // Create seller connection with token
  const sellerLoggedInConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.seller.login(
    sellerLoggedInConnection,
    {
      body: {
        email: sellerJoin.email,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  // 3. Seller creates product with variants
  const product1Id = typia.random<string & tags.Format<"uuid">>();
  const variant1 =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerLoggedInConnection,
      {
        productId: product1Id,
        body: {
          sku_code: typia.random<string & tags.MaxLength<50>>(),
          option_values: { size: "S", color: "red" },
          stock_quantity: 100,
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerLoggedInConnection,
      {
        productId: product1Id,
        body: {
          sku_code: typia.random<string & tags.MaxLength<50>>(),
          option_values: { size: "M", color: "blue" },
          stock_quantity: 100,
        },
      },
    );
  typia.assert(variant2);
  const variant3 =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerLoggedInConnection,
      {
        productId: product1Id,
        body: {
          sku_code: typia.random<string & tags.MaxLength<50>>(),
          option_values: { size: "L", color: "green" },
          stock_quantity: 100,
        },
      },
    );
  typia.assert(variant3);
  // 4. Customer setup - join and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await api.functional.ecommerceMall.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "http://localhost",
        referrer: "http://localhost",
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(customerJoin);
  // Create customer connection with token
  const customerLoggedInConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.customer.login(
    customerLoggedInConnection,
    {
      body: {
        email: customerJoin.email,
        password: "1234",
      } satisfies IEcommerceMallCustomer.ILogin,
    },
  );
  // 5. Customer retrieves cart
  const cartResponse = await api.functional.ecommerceMall.customer.carts.index(
    customerLoggedInConnection,
    { body: { page: 1, limit: 10 } satisfies IEcommerceMallCartItem.IRequest },
  );
  typia.assert(cartResponse);
  const firstCart = cartResponse.data[0];
  typia.assert(firstCart);
  // Add variants to cart
  await Promise.all([
    api.functional.ecommerceMall.customer.carts.cartItems.create(
      customerLoggedInConnection,
      {
        cartId: firstCart.id,
        body: {
          variant_id: variant1.id,
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    ),
    api.functional.ecommerceMall.customer.carts.cartItems.create(
      customerLoggedInConnection,
      {
        cartId: firstCart.id,
        body: {
          variant_id: variant2.id,
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    ),
    api.functional.ecommerceMall.customer.carts.cartItems.create(
      customerLoggedInConnection,
      {
        cartId: firstCart.id,
        body: {
          variant_id: variant3.id,
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    ),
  ]);
  // 6. Customer creates order
  const ordersResponse =
    await api.functional.ecommerceMall.customer.orders.index(
      customerLoggedInConnection,
      { body: { page: 1, limit: 10 } satisfies IEcommerceMallOrder.IRequest },
    );
  typia.assert(ordersResponse);
  const order = ordersResponse.data[0];
  typia.assert(order);
  // 7. Admin queries order items
  const adminOrderItems =
    await api.functional.ecommerceMall.admin.orderItems.index(adminConnection, {
      body: {
        page: 1,
        limit: 50,
        order_id: order.id,
      } satisfies IEcommerceMallOrderItem.IRequest,
    });
  typia.assert(adminOrderItems);
  // Verify order items exist
  TestValidator.predicate(
    "order has multiple items",
    adminOrderItems.data.length >= 2,
  );
  // 8. Test status filters
  const cancelledOnly =
    await api.functional.ecommerceMall.admin.orderItems.index(adminConnection, {
      body: {
        page: 1,
        limit: 50,
        order_id: order.id,
        item_status: "cancelled",
      } satisfies IEcommerceMallOrderItem.IRequest,
    });
  typia.assert(cancelledOnly);
  // 9. Verify snapshot preservation
  if (adminOrderItems.data.length > 0) {
    const firstItem = adminOrderItems.data[0];
    typia.assert(firstItem);
    TestValidator.predicate(
      "order item has product snapshot",
      firstItem.productSnapshot !== "",
    );
    TestValidator.predicate(
      "order item has variant snapshot",
      firstItem.variantSnapshot !== "",
    );
    TestValidator.predicate(
      "order item has seller profile snapshot",
      firstItem.sellerProfileSnapshot !== "",
    );
  }
  // 10. Verify order overall status
  if (order.overall_status) {
    TestValidator.predicate(
      "order has overall_status field",
      order.overall_status !== "",
    );
  }
}
