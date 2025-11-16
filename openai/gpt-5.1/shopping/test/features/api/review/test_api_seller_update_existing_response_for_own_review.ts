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
 * Validate that a seller can update an existing seller response on a review for
 * one of their products, and that the update overwrites the body while keeping
 * identity and associations stable.
 *
 * Business flow:
 *
 * 1. Platform admin joins to allow platform-level catalog creation.
 * 2. Seller joins to own a product and later respond to a review.
 * 3. Customer joins to place an order and create a review.
 * 4. Admin creates a brand and a base product; seller creates a seller product,
 *    option type, option value, and inventory-backed SKU via the provided
 *    APIs.
 * 5. Customer creates a cart, adds the SKU, creates an order, and writes a review
 *    for the seller's product.
 * 6. Seller creates an initial sellerResponse for that review.
 * 7. Seller calls PUT /shoppingMall/seller/reviews/{reviewId}/sellerResponse with
 *    an updated body.
 * 8. Test asserts that:
 *
 *    - The update succeeds and returns IShoppingMallProductReviewSellerResponse.
 *    - The response id and review/seller linkage remain unchanged.
 *    - The body is updated and updated_at changes.
 */
export async function test_api_seller_update_existing_response_for_own_review(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Seller joins
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    storeName: `store-${RandomGenerator.alphabets(8)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerId: string & tags.Format<"uuid"> = sellerAuthorized.id;

  // 3. Customer joins
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://mall.example.com/join",
    referrer: "https://mall.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 4. Admin: create brand
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4-1. Admin: create base product (using sellerId and brand.id)
  const baseProductCode = `BASE-${RandomGenerator.alphaNumeric(8)}`;
  const baseProductCreateBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: baseProductCode,
    name: `Base Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/base-product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const baseProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: baseProductCreateBody },
    );
  typia.assert(baseProduct);

  // 4-2. Seller: create seller product that will receive the review
  const sellerProductCode = `SELLER-${RandomGenerator.alphaNumeric(8)}`;
  const sellerProductCreateBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: sellerProductCode,
    name: `Seller Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/seller-product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductCreateBody,
    });
  typia.assert(sellerProduct);

  // Seller: product option type for seller product
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: sellerProduct.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  // Seller: product option value under that option type
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
        productCode: sellerProduct.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // Admin: create SKU under base product to have something orderable
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const skuCreateBody = {
    code: skuCode,
    name: `Variant ${RandomGenerator.name(1)}`,
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
        productCode: baseProduct.code,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // Seller: create inventory for the SKU
  const inventoryCreateBody = {
    product_sku_id: sku.id,
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

  // 5. Customer: create cart
  const cartCreateBody = {
    currency_code: "KRW",
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
        body: cartCreateBody,
      },
    );
  typia.assert(cart);

  // Customer: add item to cart
  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "First item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  // Customer: create order (use simple snapshot values consistent with 1 item)
  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: 9000,
    discount_total_amount: 0,
    shipping_total_amount: 0,
    tax_total_amount: 0,
    grand_total_amount: 9000,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Please deliver quickly",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // Customer: create review for seller product
  const reviewCreateBody = {
    rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Great product!" as string & tags.MinLength<1> & tags.MaxLength<255>,
    body: RandomGenerator.paragraph({ sentences: 5 }) as string &
      tags.MinLength<1>,
  } satisfies IShoppingMallProductReview.ICreate;

  const review: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: sellerProduct.id,
        body: reviewCreateBody,
      },
    );
  typia.assert(review);

  // 6. Seller: create initial seller response for the review
  // Ensure seller is authenticated (login after previous customer operations)
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/dashboard",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const initialResponseBodyText = RandomGenerator.paragraph({ sentences: 4 });

  const sellerResponseCreateBody = {
    body: initialResponseBodyText,
  } satisfies IShoppingMallProductReviewSellerResponse.ICreate;

  const initialResponse: IShoppingMallProductReviewSellerResponse =
    await api.functional.shoppingMall.seller.reviews.sellerResponse.create(
      connection,
      {
        reviewId: review.id as string & tags.Format<"uuid">,
        body: sellerResponseCreateBody,
      },
    );
  typia.assert(initialResponse);

  TestValidator.equals(
    "initial response is linked to review",
    initialResponse.review.review_id,
    review.id,
  );
  TestValidator.equals(
    "initial response body matches",
    initialResponse.body,
    initialResponseBodyText,
  );

  // 7. Seller: update the seller response
  const updatedResponseBodyText = RandomGenerator.paragraph({ sentences: 6 });

  const sellerResponseUpdateBody = {
    body: updatedResponseBodyText,
  } satisfies IShoppingMallProductReviewSellerResponse.IUpdate;

  const updatedResponse: IShoppingMallProductReviewSellerResponse =
    await api.functional.shoppingMall.seller.reviews.sellerResponse.update(
      connection,
      {
        reviewId: review.id as string & tags.Format<"uuid">,
        body: sellerResponseUpdateBody,
      },
    );
  typia.assert(updatedResponse);

  // 8. Assertions for update behavior
  TestValidator.equals(
    "response id remains the same after update",
    updatedResponse.id,
    initialResponse.id,
  );

  TestValidator.equals(
    "response still linked to same review",
    updatedResponse.review.review_id,
    initialResponse.review.review_id,
  );

  TestValidator.equals(
    "response still linked to same seller",
    updatedResponse.seller.id,
    initialResponse.seller.id,
  );

  TestValidator.equals(
    "response body updated to new text",
    updatedResponse.body,
    updatedResponseBodyText,
  );

  TestValidator.notEquals(
    "response body changed from initial",
    updatedResponse.body,
    initialResponse.body,
  );

  TestValidator.notEquals(
    "updated_at timestamp should change after update",
    updatedResponse.updated_at,
    initialResponse.updated_at,
  );

  TestValidator.equals(
    "created_at timestamp should stay the same",
    updatedResponse.created_at,
    initialResponse.created_at,
  );
}
