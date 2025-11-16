import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderDispute";
import type { IShoppingMallOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLine";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_seller_dispute_seller_view_cross_seller_access_forbidden(
  connection: api.IConnection,
) {
  // 1. Register Seller A
  const sellerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerAJoinBody = {
    email: sellerAEmail,
    password: "sellerA-password",
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAAuthorized);

  // 2. Register Seller B
  const sellerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerBJoinBody = {
    email: sellerBEmail,
    password: "sellerB-password",
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerBAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerBAuthorized);

  // 3. Register Customer
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerJoinBody = {
    email: customerEmail,
    password: "customer-password",
    name: RandomGenerator.name(2),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 4. Login as Seller A (ensure seller token is active)
  const sellerALoginBody = {
    email: sellerAEmail,
    password: "sellerA-password",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerALogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerALogin);

  // 5. Seller A creates a product
  const productCode: string = RandomGenerator.alphaNumeric(12);
  const productCreateBody = {
    shopping_mall_seller_id: sellerALogin.id,
    shopping_mall_brand_id: null,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 6. Seller A defines an option type
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(optionType);

  // 7. Seller A defines an option value
  const optionValueCreateBody = {
    value: "red",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(optionValue);

  // 8. Seller A creates a SKU
  const skuCode: string = RandomGenerator.alphaNumeric(10);
  const skuCreateBody = {
    code: skuCode,
    name: `${product.name} - Red`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallProductSku>(sku);

  // 9. Seller A creates inventory item for the SKU
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert<IShoppingMallInventoryItem>(inventoryItem);

  // 10. Login as Customer
  const customerLoginBody = {
    email: customerEmail,
    password: "customer-password",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    userAgent: "e2e-test-agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLogin);

  // 11. Customer creates a cart
  const cartCreateBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerCart>(cart);

  // 12. Customer adds SKU to cart
  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "e2e test item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerCartItem>(cartItem);

  // 13. Customer creates an order from the cart
  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: cart.subtotal_amount,
    discount_total_amount: cart.discount_amount,
    shipping_total_amount: cart.shipping_amount,
    tax_total_amount: cart.tax_amount,
    grand_total_amount: cart.total_amount,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "e2e order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert<IShoppingMallOrder>(order);

  // 14. Customer opens a dispute for the order
  const disputeCreateBody = {
    shopping_mall_order_line_id: null,
    issue_category: "non_delivery",
    issue_title: "Package did not arrive",
    issue_description:
      "The package has not arrived within the expected timeframe.",
  } satisfies IShoppingMallOrderDispute.ICreate;

  const dispute: IShoppingMallOrderDispute =
    await api.functional.shoppingMall.customer.orders.disputes.create(
      connection,
      {
        orderId: order.id,
        body: disputeCreateBody,
      },
    );
  typia.assert<IShoppingMallOrderDispute>(dispute);

  // 15. Login as Seller B and verify access is forbidden for Seller B
  const sellerBLoginBody = {
    email: sellerBEmail,
    password: "sellerB-password",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerBLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerBLogin);

  await TestValidator.error(
    "cross-seller cannot view dispute for another seller's order segment",
    async () => {
      await api.functional.shoppingMall.seller.orders.disputes.seller.at(
        connection,
        {
          orderId: order.id,
          disputeId: dispute.id,
        },
      );
    },
  );

  // 16. Login back as Seller A and confirm authorized access works
  const sellerALoginAgainBody = {
    email: sellerAEmail,
    password: "sellerA-password",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerALoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginAgainBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerALoginAgain);

  const sellerViewDispute: IShoppingMallOrderDispute =
    await api.functional.shoppingMall.seller.orders.disputes.seller.at(
      connection,
      {
        orderId: order.id,
        disputeId: dispute.id,
      },
    );
  typia.assert<IShoppingMallOrderDispute>(sellerViewDispute);

  TestValidator.equals(
    "authorized seller sees the same dispute id",
    sellerViewDispute.id,
    dispute.id,
  );
  TestValidator.equals(
    "authorized seller sees dispute associated with same order",
    sellerViewDispute.shopping_mall_order_id,
    order.id,
  );
}
