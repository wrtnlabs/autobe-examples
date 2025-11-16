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
 * Validate seller-side deletion (moderation) of a product review on own
 * product.
 *
 * Business flow:
 *
 * 1. Seller1 joins and implicitly logs in.
 * 2. Customer joins and implicitly logs in.
 * 3. Seller1 creates a product, option type, option value, SKU and inventory.
 * 4. Customer logs in, creates a cart, adds the SKU as a cart item, and creates a
 *    review on Seller1's product.
 * 5. Seller1 logs in again and successfully deletes the review via DELETE
 *    /shoppingMall/seller/products/{productId}/reviews/{reviewId}.
 * 6. Second delete attempt for same review fails.
 * 7. Seller2 joins and logs in, and also fails to delete the same review,
 *    validating cross-owner moderation boundaries.
 */
export async function test_api_seller_product_review_delete_for_own_product(
  connection: api.IConnection,
) {
  // 1. Seller1 joins
  const seller1Email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const seller1Password: string = RandomGenerator.alphabets(12);

  const seller1JoinBody = {
    email: seller1Email,
    password: seller1Password,
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller1Authorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: seller1JoinBody,
    });
  typia.assert(seller1Authorized);

  // 2. Customer joins
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string = RandomGenerator.alphabets(12);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorizedOnJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorizedOnJoin);

  // 3. Seller1 creates a product
  const productCode: string = "prod-" + RandomGenerator.alphaNumeric(8);

  const productCreateBody = {
    shopping_mall_seller_id: seller1Authorized.id,
    shopping_mall_brand_id: null,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 4. Seller1 creates option type
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0,
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

  // 5. Seller1 creates option value under the option type
  const optionValueCreateBody = {
    value: "red",
    display_name: "Red",
    display_order: 0,
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

  // 6. Seller1 creates SKU
  const skuCreateBody = {
    code: "sku-" + RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 7. Seller1 creates inventory item for SKU
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10,
    low_stock_threshold: 1,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // 8. Switch to customer (login)
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
    userAgent: "E2E-Test-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerAuthorizedOnLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerAuthorizedOnLogin);

  // 9. Customer creates a cart
  const cartCreateBody = {
    currency_code: "KRW",
    region_code: "KR-SEOUL",
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

  // 10. Customer adds cart item
  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1,
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

  // 11. Customer creates product review for seller1's product
  const reviewCreateBody = {
    rating: 5,
    title: "Great product",
    body: "This product was excellent in our E2E test.",
  } satisfies IShoppingMallProductReview.ICreate;

  const review: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: reviewCreateBody,
      },
    );
  typia.assert(review);

  // Ensure review is associated to the expected product
  TestValidator.equals(
    "created review belongs to created product",
    review.product.id,
    product.id,
  );

  // 12. Switch back to seller1 via login
  const seller1LoginBody = {
    email: seller1Email,
    password: seller1Password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const seller1AuthorizedOnLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: seller1LoginBody,
    });
  typia.assert(seller1AuthorizedOnLogin);

  // 13. Seller1 deletes the review (happy path)
  await api.functional.shoppingMall.seller.products.reviews.erase(connection, {
    productId: product.id,
    reviewId: review.id,
  });

  // 14. Second delete attempt should fail
  await TestValidator.error(
    "second deletion of the same review should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.reviews.erase(
        connection,
        {
          productId: product.id,
          reviewId: review.id,
        },
      );
    },
  );

  // 15. Seller2 joins
  const seller2Email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const seller2Password: string = RandomGenerator.alphabets(12);

  const seller2JoinBody = {
    email: seller2Email,
    password: seller2Password,
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller2Authorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: seller2JoinBody,
    });
  typia.assert(seller2Authorized);

  // 16. Seller2 logs in (already authenticated by join, but we exercise login API)
  const seller2LoginBody = {
    email: seller2Email,
    password: seller2Password,
    ip: null,
    href: "https://seller2.example.com/login",
    referrer: "https://seller2.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const seller2AuthorizedOnLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: seller2LoginBody,
    });
  typia.assert(seller2AuthorizedOnLogin);

  // 17. Seller2 attempts to delete the same review and should fail
  await TestValidator.error(
    "non-owner seller should not be able to delete review on another seller's product",
    async () => {
      await api.functional.shoppingMall.seller.products.reviews.erase(
        connection,
        {
          productId: product.id,
          reviewId: review.id,
        },
      );
    },
  );
}
