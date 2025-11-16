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
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Ensure that a customer cannot access another customer's wishlist item.
 *
 * Business goal:
 *
 * - Validate that GET
 *   /shoppingMall/customer/wishlists/{wishlistId}/items/{wishlistItemId}
 *   enforces ownership checks so that only the owning customer can read a
 *   wishlist item.
 *
 * Scenario steps:
 *
 * 1. Platform admin joins and is authenticated (token managed by SDK).
 * 2. Platform admin creates a category tree (catalog dependency, although not
 *    directly used).
 * 3. Platform admin creates a brand.
 * 4. Platform admin creates a product, using a random seller id and linking the
 *    brand.
 * 5. Platform admin creates a SKU for that product using its business code.
 * 6. Customer A joins and becomes authenticated.
 * 7. Customer A creates a wishlist.
 * 8. Customer A adds a wishlist item that references the created product and SKU.
 * 9. Customer A successfully reads that wishlist item via the .at endpoint
 *    (positive control).
 * 10. Customer B joins and becomes authenticated (overwriting Authorization header
 *     via SDK).
 * 11. Customer B attempts to read Customer A's wishlist item; the call must fail
 *     with an HttpError, which we assert via TestValidator.error without
 *     checking specific status codes.
 * 12. Customer B creates their own wishlist and wishlist item and successfully
 *     reads it to confirm that access control is scoped per customer and B can
 *     access their own resources.
 */
export async function test_api_wishlist_item_detail_not_found_for_other_customer(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (authenticate as platformAdmin)
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminJoinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const platformAdminJoinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        email: platformAdminEmail,
        name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
        ip: null,
        href: platformAdminJoinHref,
        referrer: platformAdminJoinReferrer,
      } satisfies IShoppingMallPlatformAdminJoin.IRequest,
    });
  typia.assert(platformAdmin);

  // 2. Create a category tree (catalog dependency)
  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(12),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          active: true,
          defaultLocale: "en-US",
        } satisfies IShoppingMallCategoryTree.ICreate,
      },
    );
  typia.assert(categoryTree);

  // 3. Create a brand
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        slug: RandomGenerator.alphaNumeric(16),
        description: RandomGenerator.paragraph({ sentences: 6 }),
        logo_uri: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBrand.ICreate,
    });
  typia.assert(brand);

  // 4. Create a product; seller id is a random UUID and brand id from created brand
  const randomSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: {
          shopping_mall_seller_id: randomSellerId,
          shopping_mall_brand_id: brand.id,
          code: RandomGenerator.alphaNumeric(12),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          short_description: RandomGenerator.paragraph({ sentences: 4 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          status: "active",
          is_multi_sku: true,
          primary_image_uri: typia.random<string & tags.Format<"uri">>(),
          additional_data: null,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);

  // 5. Create a SKU for that product using its code
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: {
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          listPrice: 10000,
          salePrice: 9000,
          currency: "KRW",
          isActive: true,
          isPurchasable: true,
        } satisfies IShoppingMallProductSku.ICreate,
      },
    );
  typia.assert(sku);

  // 6. Customer A joins (authenticate as customer A)
  const customerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerAJoinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const customerAJoinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerAEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        ip: null,
        href: customerAJoinHref,
        referrer: customerAJoinReferrer,
      } satisfies IShoppingMallCustomerAuth.IJoin,
    });
  typia.assert(customerA);

  // 7. Customer A creates a wishlist
  const wishlistA: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: "Customer A Wishlist",
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(wishlistA);

  // 8. Customer A creates a wishlist item that references product and SKU
  const wishlistItemA: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlistA.id,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_sku_id: sku.id,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItemA);

  // 9. Positive control: Customer A can read their own wishlist item
  const fetchedByA: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.at(connection, {
      wishlistId: wishlistA.id,
      wishlistItemId: wishlistItemA.id,
    });
  typia.assert(fetchedByA);

  TestValidator.equals(
    "customer A should read own wishlist item successfully (id)",
    fetchedByA.id,
    wishlistItemA.id,
  );
  TestValidator.equals(
    "customer A should read own wishlist item successfully (wishlist)",
    fetchedByA.wishlist_id,
    wishlistA.id,
  );

  // 10. Customer B joins (authenticate as another customer)
  const customerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerBJoinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const customerBJoinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerBEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        ip: null,
        href: customerBJoinHref,
        referrer: customerBJoinReferrer,
      } satisfies IShoppingMallCustomerAuth.IJoin,
    });
  typia.assert(customerB);

  // 11. Negative case: Customer B attempts to read Customer A's wishlist item
  await TestValidator.error(
    "customer B must not access customer A's wishlist item",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.at(
        connection,
        {
          wishlistId: wishlistA.id,
          wishlistItemId: wishlistItemA.id,
        },
      );
    },
  );

  // 12. Optional: Customer B creates own wishlist and wishlist item and can read it
  const wishlistB: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: "Customer B Wishlist",
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(wishlistB);

  const wishlistItemB: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlistB.id,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_sku_id: sku.id,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItemB);

  const fetchedByB: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.at(connection, {
      wishlistId: wishlistB.id,
      wishlistItemId: wishlistItemB.id,
    });
  typia.assert(fetchedByB);

  TestValidator.equals(
    "customer B should read own wishlist item successfully (id)",
    fetchedByB.id,
    wishlistItemB.id,
  );
  TestValidator.equals(
    "customer B should read own wishlist item successfully (wishlist)",
    fetchedByB.wishlist_id,
    wishlistB.id,
  );
}
