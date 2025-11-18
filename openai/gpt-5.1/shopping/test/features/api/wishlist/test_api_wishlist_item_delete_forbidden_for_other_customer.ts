import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Verify that a customer cannot delete another customer’s wishlist item.
 *
 * Business context:
 *
 * - The shopping mall platform allows customers to save products/SKUs in
 *   wishlists. Each wishlist and its items are strictly owned by a single
 *   customer.
 * - The DELETE
 *   /shoppingMall/customer/wishlists/{wishlistId}/items/{wishlistItemId}
 *   endpoint must enforce ownership checks so that only the wishlist owner can
 *   remove items.
 *
 * Test scope:
 *
 * - Build a realistic catalog stack: admin + seller + product + category + SKU
 *
 *   - Inventory state so the wishlist item references valid catalog entities.
 * - Create Customer A and Customer B as distinct actors.
 * - As Customer A, create a wishlist and a wishlist item bound to a real
 *   product/SKU.
 * - As Customer B, attempt to delete Customer A’s wishlist item and assert that
 *   the deletion is forbidden through an HTTP error.
 * - Confirm we never perform a successful delete as Customer B and rely on the
 *   error semantics to conclude authorization is enforced.
 */
export async function test_api_wishlist_item_delete_forbidden_for_other_customer(
  connection: api.IConnection,
) {
  // Helper to create random but valid URLs
  const randomUrl = (): string =>
    `https://example.com/${RandomGenerator.alphaNumeric(8)}`;

  // 1. Admin bootstrap: create an admin and login
  const adminEmail: string = typia.random<string & tags.Format<"email">>();

  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!" as string & tags.Format<"password">,
      ip: null,
      href: randomUrl(),
      referrer: randomUrl(),
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  // Explicit login to simulate typical flow (also ensures token on connection)
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!" as string & tags.Format<"password">,
      ip: null,
      href: randomUrl(),
      referrer: randomUrl(),
    } satisfies IShoppingMallAdminLogin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  // 2. Seller bootstrap: create seller and login
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();

  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "SellerPassword123!" as string & tags.Format<"password">,
      ip: null,
      href: randomUrl(),
      referrer: randomUrl(),
    } satisfies IShoppingMallSellerAuthJoin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "SellerPassword123!",
      ip: null,
      href: randomUrl(),
      referrer: randomUrl(),
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  // 3. As Admin, create SKU inventory state and category
  // Switch back to admin context
  const adminLoginAgain = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!" as string & tags.Format<"password">,
      ip: null,
      href: randomUrl(),
      referrer: randomUrl(),
    } satisfies IShoppingMallAdminLogin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginAgain);

  const inventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: {
          code: `state-${RandomGenerator.alphaNumeric(8)}`,
          name: "In Stock",
          description: "Purchasable inventory state for tests",
          is_purchasable: true,
        } satisfies IShoppingMallSkuInventoryState.ICreate,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: null,
        slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
        name_en: "Test Category",
        description_en: "Category for wishlist authorization tests",
        status: "active",
        sort_order: 1 as number & tags.Type<"int32">,
        is_leaf: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert<IShoppingMallCategory>(category);

  // 4. As Seller, create a product and SKU
  const sellerLoginAgain = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "SellerPassword123!",
      ip: null,
      href: randomUrl(),
      referrer: randomUrl(),
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginAgain);

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        code: `prod-${RandomGenerator.alphaNumeric(8)}`,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 5 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: "TestBrand",
        model_name: "Model-X",
        status: "active",
        primary_image_uri: randomUrl(),
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert<IShoppingMallProduct>(product);

  // Link product to category as Admin
  const adminLoginForProductCategory = await api.functional.auth.admin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPassword123!" as string & tags.Format<"password">,
        ip: null,
        href: randomUrl(),
        referrer: randomUrl(),
      } satisfies IShoppingMallAdminLogin.ICreate,
    },
  );
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginForProductCategory);

  const productCategoryLink =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_category_id: category.id,
          is_primary: true,
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategoryLink);

  // Back to Seller for SKU creation
  const sellerLoginForSku = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "SellerPassword123!",
      ip: null,
      href: randomUrl(),
      referrer: randomUrl(),
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginForSku);

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        code: `sku-${RandomGenerator.alphaNumeric(8)}`,
        barcode: null,
        status: "active",
        price: 199.99,
        original_price: 249.99,
        inventory_quantity: 100 as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        low_stock_threshold: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        shopping_mall_sku_inventory_state_id: inventoryState.id,
        attribute_value_ids: [],
        external_ids: [],
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert<IShoppingMallSku>(sku);

  // 5. Customer A: join, wishlist, and wishlist item
  const customerAEmail: string = typia.random<string & tags.Format<"email">>();

  const customerAJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerAEmail,
      password: "CustomerAPassword123!" as string & tags.Format<"password">,
      ip: null,
      href: randomUrl(),
      referrer: randomUrl(),
    } satisfies IShoppingMallCustomerJoin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAJoin);

  const wishlistA = await api.functional.shoppingMall.customer.wishlists.create(
    connection,
    {
      body: {
        name: "Customer A Wishlist",
        description: "Wishlist owned by Customer A for authorization tests",
        is_default: true,
        status: "active",
      } satisfies IShoppingMallWishlist.ICreate,
    },
  );
  typia.assert<IShoppingMallWishlist>(wishlistA);

  const wishlistItemA =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlistA.id,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_sku_id: sku.id,
          position: null,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert<IShoppingMallWishlistItem>(wishlistItemA);

  // 6. Customer B: join and attempt unauthorized delete
  const customerBEmail: string = typia.random<string & tags.Format<"email">>();

  const customerBJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerBEmail,
      password: "CustomerBPassword123!" as string & tags.Format<"password">,
      ip: null,
      href: randomUrl(),
      referrer: randomUrl(),
    } satisfies IShoppingMallCustomerJoin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerBJoin);

  // Attempt to delete Customer A's wishlist item as Customer B
  await TestValidator.httpError(
    "customer B cannot delete wishlist item belonging to customer A",
    [401, 403, 404],
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

  // 7. Switch back to Customer A to ensure token switching still works
  const customerALogin = await api.functional.auth.customer.login(connection, {
    body: {
      email: customerAEmail,
      password: "CustomerAPassword123!",
      ip: null,
      href: randomUrl(),
      referrer: randomUrl(),
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerALogin);

  // Business-level assertion: no successful erase was executed for Customer B.
  // Additional persistence checks would require item listing/get APIs which are
  // not part of the current SDK surface, so we limit our validation to the
  // enforced authorization failure above.
}
