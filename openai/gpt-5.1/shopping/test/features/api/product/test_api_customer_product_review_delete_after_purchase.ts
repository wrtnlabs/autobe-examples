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
 * Customer can delete their own product review after completing purchase.
 *
 * Business flow:
 *
 * 1. Platform admin joins and is authenticated (for realism of catalog setup).
 * 2. Seller joins and is authenticated.
 * 3. Platform admin creates a brand (used for the product).
 * 4. Seller creates a multi-SKU product that references the created brand.
 * 5. Seller defines an option type (e.g., Color) and creates an option value
 *    (e.g., Red).
 * 6. Seller creates a SKU under the product.
 * 7. Seller creates an inventory item for that SKU so it is purchasable.
 * 8. Customer joins and is authenticated.
 * 9. Customer creates a cart and adds the SKU as a line item.
 * 10. Customer creates an order from the cart to establish purchase history.
 * 11. Customer creates a product review for the purchased product.
 * 12. Customer deletes the review via DELETE
 *     /shoppingMall/customer/products/{productId}/reviews/{reviewId}.
 * 13. Attempting to delete the same review again results in an error, implying the
 *     review was successfully removed.
 */
export async function test_api_customer_product_review_delete_after_purchase(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (primarily to mirror multi-actor setup; we do not
  //    need the admin token later, but this reflects realistic flows).
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: "AdminPassword!234",
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Seller joins and authenticates.
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.example.com`,
    password: "SellerPassword!234",
    storeName: `Store-${RandomGenerator.alphabets(6)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3. Platform admin logs in again (token switching demonstration) and
  //    creates a brand.
  const platformAdminLoginBody = {
    email: platformAdminAuthorized.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  const brandCreateBody = {
    name: `Brand-${RandomGenerator.alphabets(6)}`,
    slug: `brand-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Platform admin creates a category tree (not strictly required for the
  //    rest of the flow but part of realistic catalog setup).
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphabets(6)}`,
    name: "Default Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;
  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeCreateBody,
      },
    );
  typia.assert(categoryTree);

  // 5. Seller logs in (switch token back to seller) and creates a product.
  const sellerLoginBody = {
    email: sellerAuthorized.email,
    password: sellerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const productCode = `prod-${RandomGenerator.alphaNumeric(10)}`;
  const productCreateBody = {
    shopping_mall_seller_id: sellerLogin.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product-${RandomGenerator.alphabets(6)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product-primary.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 6. Seller creates an option type (e.g., Color).
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;
  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  // 7. Seller creates an option value (e.g., Red) under that type.
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
        productCode,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // 8. Seller creates a SKU for the product.
  const skuCode = `sku-${RandomGenerator.alphaNumeric(8)}`;
  const skuCreateBody = {
    code: skuCode,
    name: `SKU-${RandomGenerator.alphabets(4)}`,
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuCreateBody,
    });
  typia.assert(sku);
  TestValidator.equals(
    "sku product code matches",
    sku.productCode,
    productCode,
  );

  // 9. Seller creates inventory for that SKU.
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventory);
  TestValidator.equals(
    "inventory sku id matches created sku",
    inventory.product_sku_id,
    sku.id,
  );

  // 10. Customer joins and authenticates.
  const customerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.example.com`,
    password: "CustomerPassword!234",
    name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
    userAgent: "E2E-Test-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 11. Customer creates a cart.
  const cartCreateBody = {
    currency_code: sku.currency,
    region_code: "US",
    channel: "web",
    metadata: {
      campaign: "spring-sale",
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
  typia.assert(cart);

  // 12. Customer adds the SKU as a cart item.
  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Test purchase for review deletion",
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
  TestValidator.equals("cart item sku id matches sku", cartItem.skuId, sku.id);

  // 13. Customer creates an order from the cart.
  //     For simplicity, reuse the pattern from the mock test and rely on
  //     typia.random for the complex IShoppingMallOrder.ICreate body.
  const orderCreateBody: IShoppingMallOrder.ICreate =
    typia.random<IShoppingMallOrder.ICreate>();
  // Override the cart id to ensure the order is created from the cart we built.
  (orderCreateBody as IShoppingMallOrder.ICreate).customer_cart_id = cart.id;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);
  TestValidator.equals(
    "order customer id matches customer",
    order.customer_id,
    customerLogin.id,
  );

  // 14. Customer creates a product review for the purchased product.
  const reviewCreateBody = {
    rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Excellent product" as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    body: RandomGenerator.paragraph({ sentences: 8 }) as string &
      tags.MinLength<1>,
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
  TestValidator.equals(
    "review product id matches product",
    review.product.id,
    product.id,
  );

  // 15. Customer deletes their own review.
  await api.functional.shoppingMall.customer.products.reviews.erase(
    connection,
    {
      productId: product.id,
      reviewId: review.id,
    },
  );

  // 16. Deleting the same review again should result in an error, implying
  //     the review has already been removed.
  await TestValidator.error(
    "second delete should fail for deleted review",
    async () => {
      await api.functional.shoppingMall.customer.products.reviews.erase(
        connection,
        {
          productId: product.id,
          reviewId: review.id,
        },
      );
    },
  );
}
