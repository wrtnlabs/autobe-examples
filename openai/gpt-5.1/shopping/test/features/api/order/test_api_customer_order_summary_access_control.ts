import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderSellerSegmentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerSegmentSummary";
import type { IShoppingMallOrderSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSummary";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_customer_order_summary_access_control(
  connection: api.IConnection,
) {
  // 1. Register Customer A via join (this also authenticates as A)
  const customerAJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer-a.example.com/join",
    referrer: "https://customer-a.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinInput,
    });
  typia.assert(customerAAuthorized);

  // 2. Create Customer A cart
  const cartCreateBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cartA: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(cartA);

  // 3. Register and authenticate a seller, create product + SKU + inventory
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // Seller product creation
  const sellerProductCode = RandomGenerator.alphaNumeric(10);
  const sellerProductCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: undefined,
    code: sellerProductCode as string & tags.MinLength<1>,
    name: RandomGenerator.name(2) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductCreateBody,
    });
  typia.assert(sellerProduct);

  // Seller SKU creation under the product
  const sellerSkuCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sellerSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: sellerProduct.code,
      body: sellerSkuCreateBody,
    });
  typia.assert(sellerSku);

  // Inventory for the SKU
  const inventoryCreateBody = {
    product_sku_id: sellerSku.id,
    on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // 4. Switch back to Customer A by logging in (join already authenticated,
  // but seller.join updated connection headers to seller token)
  const customerALoginBody = {
    email: customerAJoinInput.email,
    password: customerAJoinInput.password,
    ip: null,
    href: "https://customer-a.example.com/login",
    referrer: "https://customer-a.example.com/landing",
    userAgent: "E2E-CustomerA-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerALoginAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerALoginBody,
    });
  typia.assert(customerALoginAuth);

  // 5. Add SKU to Customer A cart
  const cartItemCreateBody = {
    skuId: sellerSku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Order for access-control test",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItemA: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cartA.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItemA);

  // 6. Create Customer A order from cart
  const orderCreateBody = {
    customer_cart_id: cartA.id,
    currency_code: cartA.currency_code,
    items_subtotal_amount: 80,
    discount_total_amount: 0,
    shipping_total_amount: 0,
    tax_total_amount: 0,
    grand_total_amount: 80,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Please deliver quickly.",
  } satisfies IShoppingMallOrder.ICreate;

  const orderA: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(orderA);

  // 7. Access order summary as Customer A (expect success)
  const summaryAsA: IShoppingMallOrderSummary =
    await api.functional.shoppingMall.customer.orders.summary.at(connection, {
      orderId: orderA.id,
    });
  typia.assert(summaryAsA);

  TestValidator.equals(
    "order summary id matches created order id for customer A",
    summaryAsA.id,
    orderA.id,
  );
  TestValidator.equals(
    "order summary owner matches customer A",
    summaryAsA.customer.id,
    customerAAuthorized.customer.id,
  );
  TestValidator.equals(
    "order summary grand total matches order grand total",
    summaryAsA.grandTotalAmount,
    orderA.grand_total_amount,
  );

  // 8. Register Customer B (this authenticates as B)
  const customerBJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer-b.example.com/join",
    referrer: "https://customer-b.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerBAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinInput,
    });
  typia.assert(customerBAuthorized);

  // 9. As Customer B, attempt to access Customer A's order summary (expect error)
  await TestValidator.error(
    "customer B must not access customer A order summary",
    async () => {
      await api.functional.shoppingMall.customer.orders.summary.at(connection, {
        orderId: orderA.id,
      });
    },
  );

  // 10. Switch back to Customer A and confirm access still works
  const customerALoginAgainAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerALoginBody,
    });
  typia.assert(customerALoginAgainAuth);

  const summaryAsAAgain: IShoppingMallOrderSummary =
    await api.functional.shoppingMall.customer.orders.summary.at(connection, {
      orderId: orderA.id,
    });
  typia.assert(summaryAsAAgain);

  TestValidator.equals(
    "order summary id matches created order id for customer A after re-login",
    summaryAsAAgain.id,
    orderA.id,
  );
  TestValidator.equals(
    "order summary owner still matches customer A after re-login",
    summaryAsAAgain.customer.id,
    customerAAuthorized.customer.id,
  );
}
