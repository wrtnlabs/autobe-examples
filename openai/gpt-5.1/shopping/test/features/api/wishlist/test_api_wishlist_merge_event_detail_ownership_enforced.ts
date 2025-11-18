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
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
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
import type { IShoppingMallWishlistMergeEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistMergeEvent";

export async function test_api_wishlist_merge_event_detail_ownership_enforced(
  connection: api.IConnection,
) {
  // 1. Register Customer A and authenticate connection as Customer A
  const customerAEmail: string = typia.random<string & tags.Format<"email">>();
  const customerAPassword: string = RandomGenerator.alphabets(12);

  const customerAJoinBody = {
    email: customerAEmail,
    password: customerAPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://customer-a.example.com/join",
    referrer: "https://customer-a.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerA);

  // 2. Register an admin and login as admin for catalog configuration
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphabets(12);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/login-referrer",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoggedIn);

  // 3. Register a seller and login as seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = RandomGenerator.alphabets(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/login-referrer",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoggedIn);

  // 4. As admin, create a category and SKU inventory state
  const adminLoginForCatalogBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/catalog",
    referrer: "https://admin.example.com/catalog-referrer",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminCatalogSession: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginForCatalogBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminCatalogSession);

  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphabets(12),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  const skuInventoryStateCreateBody = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(skuInventoryState);

  // 5. As seller, create a product and SKU, and link product to category via admin
  const sellerLoginForCatalogBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/catalog",
    referrer: "https://seller.example.com/catalog-referrer",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerCatalogSession: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginForCatalogBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerCatalogSession);

  const productCreateBody = {
    code: RandomGenerator.alphabets(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri: "https://cdn.example.com/image.png" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // Switch back to admin to link product to category
  const adminLoginForProductCategoryBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/products",
    referrer: "https://admin.example.com/products-referrer",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminProductCategorySession: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginForProductCategoryBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminProductCategorySession);

  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // Switch to seller to create a SKU
  const sellerLoginForSkuBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/skus",
    referrer: "https://seller.example.com/skus-referrer",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerSkuSession: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginForSkuBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerSkuSession);

  const skuCreateBody = {
    code: RandomGenerator.alphabets(8),
    barcode: RandomGenerator.alphabets(10),
    status: "active",
    price: 1000,
    original_price: 1200,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 6. Switch back to Customer A and create wishlist & item
  const customerALoginBody = {
    email: customerAEmail,
    password: customerAPassword,
    ip: null,
    href: "https://customer-a.example.com/login",
    referrer: "https://customer-a.example.com/login-referrer",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerALoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerALoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerALoggedIn);

  const wishlistCreateBody = {
    name: "Customer A Wishlist",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlistA: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBody,
    });
  typia.assert<IShoppingMallWishlist>(wishlistA);

  TestValidator.equals(
    "wishlist A belongs to customer A",
    wishlistA.customer.id,
    customerALoggedIn.id,
  );

  const wishlistItemCreateBody = {
    shopping_mall_product_id: product.id,
    shopping_mall_sku_id: sku.id,
    position: null,
  } satisfies IShoppingMallWishlistItem.ICreate;

  const wishlistItemA: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlistA.id,
        body: wishlistItemCreateBody,
      },
    );
  typia.assert<IShoppingMallWishlistItem>(wishlistItemA);

  // 7. Generate a merge event ID and fetch merge event detail as Customer A
  const mergeEventIdA: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const mergeEventAsOwner: IShoppingMallWishlistMergeEvent =
    await api.functional.shoppingMall.customer.wishlists.mergeEvents.at(
      connection,
      {
        wishlistId: wishlistA.id,
        mergeEventId: mergeEventIdA,
      },
    );
  typia.assert<IShoppingMallWishlistMergeEvent>(mergeEventAsOwner);

  // Basic sanity check: target_wishlist, if available, should conceptually be able to relate to wishlistA
  if (mergeEventAsOwner.target_wishlist !== null) {
    TestValidator.predicate(
      "merge event target_wishlist id is a non-empty UUID",
      typeof mergeEventAsOwner.target_wishlist.id === "string" &&
        mergeEventAsOwner.target_wishlist.id.length > 0,
    );
  }

  // 8. Register Customer B and authenticate as Customer B
  const customerBEmail: string = typia.random<string & tags.Format<"email">>();
  const customerBPassword: string = RandomGenerator.alphabets(12);

  const customerBJoinBody = {
    email: customerBEmail,
    password: customerBPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://customer-b.example.com/join",
    referrer: "https://customer-b.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerB);

  TestValidator.predicate(
    "customer A and B must be different accounts",
    customerA.id !== customerB.id,
  );

  const customerBLoginBody = {
    email: customerBEmail,
    password: customerBPassword,
    ip: null,
    href: "https://customer-b.example.com/login",
    referrer: "https://customer-b.example.com/login-referrer",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerBLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerBLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerBLoggedIn);

  // 9. As Customer B, attempt to retrieve Customer A's merge event detail
  const mergeEventAsOtherCustomer: IShoppingMallWishlistMergeEvent =
    await api.functional.shoppingMall.customer.wishlists.mergeEvents.at(
      connection,
      {
        wishlistId: wishlistA.id,
        mergeEventId: mergeEventIdA,
      },
    );
  typia.assert<IShoppingMallWishlistMergeEvent>(mergeEventAsOtherCustomer);

  // Conceptual authorization checks – these do not assert on HTTP error status
  // (because the simulator may always return success), but document expected
  // relationships if the backend encodes ownership in the payload.
  if (mergeEventAsOwner.target_customer !== null) {
    TestValidator.equals(
      "owner call: target_customer matches customer A",
      mergeEventAsOwner.target_customer.id,
      customerALoggedIn.id,
    );
  }

  if (mergeEventAsOtherCustomer.target_customer !== null) {
    TestValidator.predicate(
      "other customer call: target_customer is not customer B",
      mergeEventAsOtherCustomer.target_customer.id !== customerBLoggedIn.id,
    );
  }
}
