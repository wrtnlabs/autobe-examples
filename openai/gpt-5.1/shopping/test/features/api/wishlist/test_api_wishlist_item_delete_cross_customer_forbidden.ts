import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
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
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Validate authorization and data integrity when deleting wishlist items across
 * customers.
 *
 * Business goal: Ensure that a wishlist item owned by Customer A cannot be
 * deleted either by Customer B (a different authenticated customer) or by an
 * anonymous caller. Only the owner (Customer A) must be able to delete their
 * own wishlist item.
 *
 * High level steps:
 *
 * 1. Create seller and catalog data (brand, product, option type/value, SKU) so
 *    there is a concrete product/SKU that can be wishlisted.
 * 2. Register Customer A and create a wishlist and wishlist item referencing the
 *    prepared product/SKU.
 * 3. Register Customer B and, as Customer B, attempt to delete Customer A’s
 *    wishlist item – expect an HTTP authorization error via
 *    TestValidator.httpError.
 * 4. Using an unauthenticated connection (no Authorization header), attempt the
 *    same delete – expect another HTTP authorization error via
 *    TestValidator.httpError.
 * 5. Switch back to Customer A and delete the wishlist item successfully,
 *    demonstrating that previous forbidden attempts did not remove it.
 */
export async function test_api_wishlist_item_delete_cross_customer_forbidden(
  connection: api.IConnection,
) {
  // Helper to generate a simple HTTPS URL for href/referrer compatible with tags.Format<"uri">
  const randomUrl = (): string =>
    `https://example.com/${RandomGenerator.alphaNumeric(8)}`;

  // -------------------------------------------------------------------------
  // 1. Seller and catalog setup
  // -------------------------------------------------------------------------
  // 1-1. Register a seller and authenticate; token is automatically set on connection
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller-password";

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 1-2. Create a brand as platform admin (assume current token is sufficient)
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: randomUrl(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 1-3. Create a product under the seller with the created brand
  const productCode = RandomGenerator.alphaNumeric(10);
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: randomUrl(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 1-4. Create an option type for the product
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

  // 1-5. Create an option value (e.g., "Red") for the option type
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

  // 1-6. Create a SKU for the product via platformAdmin API
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
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // -------------------------------------------------------------------------
  // 2. Register Customer A and create wishlist + item
  // -------------------------------------------------------------------------
  const customerAEmail: string = typia.random<string & tags.Format<"email">>();
  const customerAPassword = "customer-a-password";

  const customerAJoinBody = {
    email: customerAEmail,
    password: customerAPassword,
    name: RandomGenerator.name(2),
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert(customerAAuthorized);

  // 2-2. Create a wishlist for Customer A
  const wishlistCreateBody = {
    name: "Customer A Wishlist",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlistA: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBody,
    });
  typia.assert(wishlistA);

  // 2-3. Create a wishlist item under Customer A’s wishlist referencing product & SKU
  const wishlistItemCreateBody = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_sku_id: sku.id,
  } satisfies IShoppingMallWishlistItem.ICreate;

  const wishlistItemA: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlistA.id,
        body: wishlistItemCreateBody,
      },
    );
  typia.assert(wishlistItemA);

  // -------------------------------------------------------------------------
  // 3. Register Customer B and attempt cross-account deletion
  // -------------------------------------------------------------------------
  const customerBEmail: string = typia.random<string & tags.Format<"email">>();
  const customerBPassword = "customer-b-password";

  const customerBJoinBody = {
    email: customerBEmail,
    password: customerBPassword,
    name: RandomGenerator.name(2),
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerBAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert(customerBAuthorized);

  // As Customer B (connection Authorization has been switched), attempt to
  // delete Customer A's wishlist item. Expect an HTTP error (forbidden or
  // not-found depending on implementation). We assert client-error family
  // using TestValidator.httpError with a set of possible statuses.
  await TestValidator.httpError(
    "cross-account delete must be forbidden or treated as not-found",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.erase(
        connection,
        {
          wishlistId: wishlistA.id,
          wishlistItemId: wishlistItemA.id,
        },
      );
    },
  );

  // -------------------------------------------------------------------------
  // 4. Attempt deletion without authentication
  // -------------------------------------------------------------------------
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.httpError(
    "anonymous delete must be unauthorized or forbidden",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.erase(
        anonymousConnection,
        {
          wishlistId: wishlistA.id,
          wishlistItemId: wishlistItemA.id,
        },
      );
    },
  );

  // -------------------------------------------------------------------------
  // 5. Switch back to Customer A and delete successfully
  // -------------------------------------------------------------------------
  const customerALoginBody = {
    email: customerAEmail,
    password: customerAPassword,
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
    userAgent: "e2e-test-agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerALogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerALoginBody,
    });
  typia.assert(customerALogin);

  // Now, as Customer A again, the deletion should succeed without throwing.
  await api.functional.shoppingMall.customer.wishlists.items.erase(connection, {
    wishlistId: wishlistA.id,
    wishlistItemId: wishlistItemA.id,
  });

  // If we reach here without HttpError, we infer that the item existed until
  // Customer A deleted it, so prior forbidden attempts did not remove it.
  await TestValidator.predicate(
    "owner can delete wishlist item successfully after forbidden attempts",
    true,
  );
}
