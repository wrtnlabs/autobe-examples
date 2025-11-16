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
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Platform admin moderates and updates a product review.
 *
 * Business goal
 *
 * - Ensure a platform administrator can update an existing product review via the
 *   moderation endpoint while preserving immutable identity fields and updating
 *   only allowed fields (rating, title, body, is_public).
 * - Validate that the returned review reflects those changes and that timestamps
 *   behave consistently.
 * - Exercise actor switching between seller, customer, and platform admin using
 *   the same connection.
 *
 * High level flow implemented in this test:
 *
 * 1. Register a seller (auth.seller.join) – this also authenticates the seller on
 *    the shared connection.
 * 2. As the seller, create a basic brand (platformAdmin.brands.create) and a
 *    product (seller.products.create). We rely on the join-authenticated seller
 *    and don’t re-login unless necessary.
 * 3. Optionally create one option type, one option value, one SKU, and an
 *    inventory item to make the catalog realistic. We don’t assert on this part
 *    because eligibility isn’t enforced at type level.
 * 4. Register a customer and authenticate it (auth.customer.join). This overwrites
 *    the connection’s auth header to be customer-scoped.
 * 5. As the customer, create a customer cart and add one item for the SKU we
 *    created. Then attempt to create an order from that cart. Order creation
 *    has many monetary/address fields; we fill them with random but correctly
 *    typed values and treat failures as non-fatal to the core review-moderation
 *    goal.
 * 6. As the customer, create a product review for the product using
 *    shoppingMall.customer.products.reviews.create.
 * 7. Authenticate as a platform administrator via auth.platformAdmin.join and
 *    auth.platformAdmin.login so that the connection carries admin tokens.
 * 8. As the platform admin, call
 *    shoppingMall.platformAdmin.products.reviews.update with a
 *    IShoppingMallProductReview.IUpdate body, changing rating, title, body, and
 *    is_public.
 * 9. Assert that:
 *
 *    - The returned review has the same id as the original review.
 *    - The product association (review.product.id) matches the created product id.
 *    - The rating/title/body/isPublic fields reflect the updated values.
 *    - CreatedAt remained the same, and updatedAt is greater than or equal to
 *         createdAt.
 */
export async function test_api_platform_admin_product_review_moderation_update(
  connection: api.IConnection,
) {
  // 1. Register seller (also authenticates as seller)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Temporarily authenticate as platform admin to create a global brand
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const brandCreateBody = {
    name: RandomGenerator.name(1),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo/" + RandomGenerator.alphaNumeric(8),
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // Switch back to seller to create product using seller login
  const sellerLoginBody = {
    email: sellerAuthorized.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuthorized);

  // 3. Create product under this seller
  const productCode = RandomGenerator.alphaNumeric(12);
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/product/" + RandomGenerator.alphaNumeric(8),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 3a. Create one option type, one option value, and one SKU for realism
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
  typia.assert(optionType);

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
  typia.assert(optionValue);

  const skuCode = RandomGenerator.alphaNumeric(10);
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
  typia.assert(sku);

  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // 4. Register and authenticate a customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 5. Customer cart + item + order (order failures are tolerated)
  const cartCreateBody = {
    channel: "web",
    is_active: true,
  } satisfies IShoppingMallCustomerCart.ICreate;
  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(cart);

  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "test item",
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
    customer_note: "Please deliver quickly",
  } satisfies IShoppingMallOrder.ICreate;
  try {
    const order: IShoppingMallOrder =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: orderCreateBody,
      });
    typia.assert(order);
  } catch {
    // Backend may require stricter address or monetary consistency.
    // Order success is not essential for the moderation test.
  }

  // 6. Customer creates a product review
  const originalReviewBody = {
    rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallProductReview.ICreate;
  const originalReview: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: originalReviewBody,
      },
    );
  typia.assert(originalReview);

  // Basic invariants about the created review
  TestValidator.equals(
    "review product id matches created product",
    originalReview.product.id,
    product.id,
  );

  const originalId = originalReview.id;
  const originalCreatedAt = originalReview.createdAt;

  // 7. Ensure platform admin context (login with existing credentials)
  const platformAdminLoginBody = {
    email: platformAdminAuthorized.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminLoginAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuthorized);

  // 8. Platform admin updates the review
  const updatedRating = 3 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>;
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedBody = RandomGenerator.content({ paragraphs: 1 });
  const updateBody = {
    rating: updatedRating,
    title: updatedTitle,
    body: updatedBody,
    is_public: false,
  } satisfies IShoppingMallProductReview.IUpdate;

  const moderatedReview: IShoppingMallProductReview =
    await api.functional.shoppingMall.platformAdmin.products.reviews.update(
      connection,
      {
        productId: product.id,
        reviewId: originalId,
        body: updateBody,
      },
    );
  typia.assert(moderatedReview);

  // 9. Assertions about moderated review
  TestValidator.equals(
    "review id must remain unchanged after moderation",
    moderatedReview.id,
    originalId,
  );
  TestValidator.equals(
    "product association must stay the same after moderation",
    moderatedReview.product.id,
    product.id,
  );
  TestValidator.equals(
    "rating should be updated by moderation",
    moderatedReview.rating,
    updatedRating,
  );
  TestValidator.equals(
    "title should be updated by moderation",
    moderatedReview.title ?? null,
    updatedTitle,
  );
  TestValidator.equals(
    "body should be updated by moderation",
    moderatedReview.body ?? null,
    updatedBody,
  );
  TestValidator.equals(
    "isPublic should reflect moderation decision",
    moderatedReview.isPublic,
    false,
  );

  // createdAt should remain the same
  TestValidator.equals(
    "createdAt should remain unchanged after moderation",
    moderatedReview.createdAt,
    originalCreatedAt,
  );

  // updatedAt should be greater than or equal to createdAt
  const createdTime = new Date(originalCreatedAt).getTime();
  const updatedTime = new Date(moderatedReview.updatedAt).getTime();
  TestValidator.predicate(
    "updatedAt should not be earlier than createdAt",
    updatedTime >= createdTime,
  );
}
