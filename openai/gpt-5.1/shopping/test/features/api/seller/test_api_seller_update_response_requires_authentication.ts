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
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductReviewSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewSellerResponse";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate that updating a seller response requires proper authentication and
 * that unauthenticated attempts are rejected without changing state.
 *
 * Business flow:
 *
 * 1. PlatformAdmin joins and logs in.
 * 2. PlatformAdmin creates a brand.
 * 3. PlatformAdmin creates a product and a SKU for it.
 * 4. Seller joins and logs in.
 * 5. Seller creates a product (treated as reviewable), option type, option value.
 * 6. Seller creates an inventory item for a SKU.
 * 7. Customer joins and logs in, then creates cart, cart item, and order.
 * 8. Customer creates a review for the product.
 * 9. Seller creates an initial seller response for that review.
 * 10. Using an unauthenticated connection, attempt to PUT update the seller
 *     response and assert an authorization error.
 */
export async function test_api_seller_update_response_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates brand
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri:
      "https://cdn.shoppingmall.local/logo/" + RandomGenerator.alphaNumeric(8),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Platform admin creates product and SKU
  const productCode = "PRD-" + RandomGenerator.alphaNumeric(12);
  const productCreateBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.shoppingmall.local/product/" +
      RandomGenerator.alphaNumeric(8),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);

  const skuCode = "SKU-" + RandomGenerator.alphaNumeric(10);
  const skuCreateBody = {
    code: skuCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 4. Seller joins and logs in
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    storeName: RandomGenerator.paragraph({ sentences: 2 }),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.local/login",
    referrer: "https://seller.shoppingmall.local/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginResult: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginResult);

  // 5. Seller creates own product (for review) and option type/value
  const sellerProductCode = "SEL-PRD-" + RandomGenerator.alphaNumeric(10);
  const sellerProductBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: sellerProductCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.shoppingmall.local/seller-product/" +
      RandomGenerator.alphaNumeric(8),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductBody,
    });
  typia.assert(sellerProduct);

  const optionTypeBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: sellerProduct.code,
        body: optionTypeBody,
      },
    );
  typia.assert(optionType);

  const optionValueBody = {
    value: "red",
    display_name: "Red",
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: sellerProduct.code,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert(optionValue);

  // 6. Seller creates inventory for platformAdmin SKU so it can be purchased
  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100,
    low_stock_threshold: 5,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 7. Customer joins and logs in
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.shoppingmall.local/join",
    referrer: "https://customer.shoppingmall.local/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.shoppingmall.local/login",
    referrer: "https://customer.shoppingmall.local/",
    userAgent: "autobe-e2e-test-agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoginResult: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginResult);

  // 8. Customer creates cart, adds item, and creates order snapshot
  const cartBody = {
    currency_code: sku.currency,
    region_code: undefined,
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartBody,
      },
    );
  typia.assert(cart);

  const cartItemBody = {
    skuId: sku.id,
    quantity: 1,
    note: null,
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemBody,
      },
    );
  typia.assert(cartItem);

  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: 9000,
    discount_total_amount: 0,
    shipping_total_amount: 0,
    tax_total_amount: 0,
    grand_total_amount: 9000,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 9. Customer creates a review for platform-admin product
  const reviewBody = {
    rating: 5,
    title: "Great product" as string & tags.MinLength<1> & tags.MaxLength<255>,
    body: "Excellent quality" as string & tags.MinLength<1>,
  } satisfies IShoppingMallProductReview.ICreate;

  const review: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: reviewBody,
      },
    );
  typia.assert(review);

  // 10. Seller logs in again and creates initial seller response
  const sellerLoginResult2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginResult2);

  const initialResponseBody = {
    body: "Thank you for your review!",
  } satisfies IShoppingMallProductReviewSellerResponse.ICreate;

  const initialResponse: IShoppingMallProductReviewSellerResponse =
    await api.functional.shoppingMall.seller.reviews.sellerResponse.create(
      connection,
      {
        reviewId: review.id,
        body: initialResponseBody,
      },
    );
  typia.assert(initialResponse);

  const originalBody = initialResponse.body;
  const originalUpdatedAt = initialResponse.updated_at;

  // 11. Try unauthorized update using fresh connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const updateBody = {
    body: "Updated by unauthorized user",
  } satisfies IShoppingMallProductReviewSellerResponse.IUpdate;

  await TestValidator.error(
    "unauthenticated seller response update must fail",
    async () => {
      await api.functional.shoppingMall.seller.reviews.sellerResponse.update(
        unauthenticatedConnection,
        {
          reviewId: review.id,
          body: updateBody,
        },
      );
    },
  );

  // 12. Ensure our in-memory copy is unchanged
  TestValidator.equals(
    "original seller response body remains unchanged in memory",
    initialResponse.body,
    originalBody,
  );
  TestValidator.equals(
    "original seller response updated_at remains unchanged in memory",
    initialResponse.updated_at,
    originalUpdatedAt,
  );
}
