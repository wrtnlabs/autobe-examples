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
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLine";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_seller_cancellation_request_update_unauthorized_for_unrelated_order(
  connection: api.IConnection,
) {
  /**
   * Validate that a seller cannot update a cancellation request for an order
   * they are not associated with.
   *
   * Business flow:
   *
   * 1. Register Seller A and Seller B.
   * 2. As Seller A, create a product, option type, option value, SKU, and
   *    inventory item.
   * 3. Register a customer and create a cart.
   * 4. As the customer, add Seller A’s SKU to the cart and create an order from
   *    that cart.
   * 5. As the customer, create a cancellation request for the order.
   * 6. As Seller B (who has no segment in this order), attempt to update the
   *    cancellation request via PUT
   *    /shoppingMall/seller/orders/{orderId}/cancellationRequests/{cancellationRequestId}.
   * 7. Assert that this update attempt fails with an authorization error using
   *    TestValidator.error.
   */

  // -----------------------------
  // 1. Seller A registration
  // -----------------------------
  const sellerAEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerAJoinBody = {
    email: sellerAEmail,
    password: "Password!123",
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerA);

  // -----------------------------
  // 2. Seller A product + option + SKU + inventory
  // -----------------------------
  const productCodeA: string = RandomGenerator.alphaNumeric(12);
  const productCreateBodyA = {
    shopping_mall_seller_id: sellerA.id,
    shopping_mall_brand_id: undefined,
    code: productCodeA,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBodyA,
    });
  typia.assert<IShoppingMallProduct>(productA);

  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: productA.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(optionType);

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
        productCode: productA.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(optionValue);

  const skuCodeA: string = RandomGenerator.alphaNumeric(10);
  const skuCreateBodyA = {
    code: skuCodeA,
    name: "SKU-Red",
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuA: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productA.code,
      body: skuCreateBodyA,
    });
  typia.assert<IShoppingMallProductSku>(skuA);

  const inventoryCreateBody = {
    product_sku_id: skuA.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert<IShoppingMallInventoryItem>(inventoryItem);

  // -----------------------------
  // 3. Seller B registration
  // -----------------------------
  const sellerBEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerBJoinBody = {
    email: sellerBEmail,
    password: "Password!123",
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerB);

  // -----------------------------
  // 4. Customer registration & login
  // -----------------------------
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "Password!123",
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://customer.join/",
    referrer: "https://landing.page/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuth);

  // Ensure we are authenticated as the customer (login again is fine to exercise login path).
  const customerLoginBody = {
    email: customerEmail,
    password: "Password!123",
    ip: null,
    href: "https://customer.login/",
    referrer: "https://landing.page/",
    userAgent: "E2E-Test-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerAuthLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthLoggedIn);

  // -----------------------------
  // 5. Customer cart creation
  // -----------------------------
  const cartCreateBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: undefined,
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

  // -----------------------------
  // 6. Add Seller A SKU to cart
  // -----------------------------
  const cartItemCreateBody = {
    skuId: skuA.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "single unit of Seller A SKU",
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

  // -----------------------------
  // 7. Create order from cart
  // -----------------------------
  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const billingAddressId = typia.random<string & tags.Format<"uuid">>();

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: 9000,
    discount_total_amount: 0,
    shipping_total_amount: 0,
    tax_total_amount: 0,
    grand_total_amount: 9000,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "please cancel later",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert<IShoppingMallOrder>(order);

  // -----------------------------
  // 8. Customer creates a cancellation request for the order
  // -----------------------------
  const cancellationCreateBody = {
    request_reason_category: "changed_mind",
    request_reason_detail: "I do not want this product anymore.",
  } satisfies IShoppingMallOrderCancellationRequest.ICreate;

  const cancellationRequest: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      connection,
      {
        orderId: order.id,
        body: cancellationCreateBody,
      },
    );
  typia.assert<IShoppingMallOrderCancellationRequest>(cancellationRequest);

  // -----------------------------
  // 9. Authenticate as Seller B
  // -----------------------------
  const sellerBLoginBody = {
    email: sellerBEmail,
    password: "Password!123",
    ip: null,
    href: "https://sellerB.login/",
    referrer: "https://seller.portal/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerBAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerBAuth);

  // -----------------------------
  // 10. Seller B attempts to update the cancellation request
  // -----------------------------
  const updateBodyBySellerB = {
    request_reason_category: "seller_attempted_update",
    request_reason_detail:
      "Seller B trying to update a request for an unrelated order.",
  } satisfies IShoppingMallOrderCancellationRequest.IUpdate;

  await TestValidator.error(
    "unrelated seller cannot update order cancellation request",
    async () => {
      await api.functional.shoppingMall.seller.orders.cancellationRequests.update(
        connection,
        {
          orderId: order.id,
          cancellationRequestId: cancellationRequest.id,
          body: updateBodyBySellerB,
        },
      );
    },
  );
}
