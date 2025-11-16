import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerCartItem";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
import type { IShoppingMallGuestCartMerge } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartMerge";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate that deleting a merged guest cart does not affect items in the
 * target customer cart.
 *
 * Business workflow under test:
 *
 * 1. Platform admin joins and creates a brand.
 * 2. Seller joins and creates a product + SKU under that brand.
 * 3. Guest user creates a guest cart and adds a SKU as a guest cart item.
 * 4. Customer joins and creates a persistent customer cart.
 * 5. Customer merges the guest cart into their customer cart.
 * 6. Verify that the customer cart contains the merged SKU item.
 * 7. Delete the original guest cart.
 * 8. Verify again that the customer cart still contains the merged SKU item with
 *    the same quantity.
 */
export async function test_api_guest_cart_delete_after_merge_to_customer_cart(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Platform admin creates a brand
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://static.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Seller joins
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.example.com`,
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.paragraph({ sentences: 2 }),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  const seller: IShoppingMallSeller.ISummary = sellerAuth.seller;

  // 4. Seller creates a product
  const productCode: string = RandomGenerator.alphaNumeric(16);
  const productCreateBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://static.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Seller creates a SKU for the product
  const skuCode: string = RandomGenerator.alphaNumeric(12);
  const skuCreateBody = {
    code: skuCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 6. Guest cart creation (unauthenticated)
  const guestCartCreateBody = {
    guest_token: RandomGenerator.alphaNumeric(24),
    ip: "192.168.0.10",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    referrer: "https://shop.example.com/landing",
    region_code: "US",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartCreateBody,
    });
  typia.assert(guestCart);

  // 7. Add an item to the guest cart
  const guestItemQuantity = 2;

  const guestCartItemCreateBody = {
    sku_id: sku.id,
    quantity: guestItemQuantity,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const guestCartItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: guestCart.id,
      body: guestCartItemCreateBody,
    });
  typia.assert(guestCartItem);

  // 8. Customer joins (authentication)
  const customerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.example.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  // 9. Customer cart creation
  const customerCartCreateBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
    source_guest_token: guestCart.guest_token,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: customerCartCreateBody,
      },
    );
  typia.assert(customerCart);

  // 10. Merge guest cart into customer cart
  const mergeBody = {
    guest_cart_id: guestCart.id,
    merge_strategy: "sum-quantities",
  } satisfies IShoppingMallGuestCartMerge.ICreate;

  const mergedCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.guestCarts.mergeIntoCustomer.create(
      connection,
      {
        body: mergeBody,
      },
    );
  typia.assert(mergedCart);

  TestValidator.equals(
    "merged cart id should equal original customer cart id",
    mergedCart.id,
    customerCart.id,
  );

  // 11. Verify merged items are present in the customer cart
  const firstItemsPage: IPageIShoppingMallCustomerCartItem.ISummary =
    await api.functional.shoppingMall.customer.customerCarts.items.index(
      connection,
      {
        customerCartId: customerCart.id,
        body: {
          page: 0,
          limit: 20,
        } satisfies IShoppingMallCustomerCartItem.IRequest,
      },
    );
  typia.assert(firstItemsPage);

  const itemsAfterMerge: IShoppingMallCustomerCartItem.ISummary[] =
    firstItemsPage.data;

  const mergedItem = itemsAfterMerge.find((item) => item.sku.id === sku.id);

  TestValidator.predicate(
    "customer cart should contain merged SKU item after merge",
    mergedItem !== undefined,
  );

  if (mergedItem !== undefined) {
    TestValidator.equals(
      "merged SKU item quantity should match guest cart quantity",
      mergedItem.quantity,
      guestItemQuantity,
    );
  }

  // 12. Delete the original guest cart
  await api.functional.shoppingMall.guestCarts.erase(connection, {
    guestCartId: guestCart.id,
  });

  // 13. Verify that customer cart items remain unchanged after guest cart deletion
  const secondItemsPage: IPageIShoppingMallCustomerCartItem.ISummary =
    await api.functional.shoppingMall.customer.customerCarts.items.index(
      connection,
      {
        customerCartId: customerCart.id,
        body: {
          page: 0,
          limit: 20,
        } satisfies IShoppingMallCustomerCartItem.IRequest,
      },
    );
  typia.assert(secondItemsPage);

  const itemsAfterDeletion: IShoppingMallCustomerCartItem.ISummary[] =
    secondItemsPage.data;

  const mergedItemAfterDeletion = itemsAfterDeletion.find(
    (item) => item.sku.id === sku.id,
  );

  TestValidator.predicate(
    "customer cart should still contain merged SKU item after guest cart deletion",
    mergedItemAfterDeletion !== undefined,
  );

  if (mergedItemAfterDeletion !== undefined) {
    TestValidator.equals(
      "merged SKU item quantity should be preserved after guest cart deletion",
      mergedItemAfterDeletion.quantity,
      guestItemQuantity,
    );
  }
}
