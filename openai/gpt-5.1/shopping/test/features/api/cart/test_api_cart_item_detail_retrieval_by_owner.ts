import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
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

/**
 * Verify that an authenticated customer can retrieve full details of a specific
 * cart item belonging to their own cart.
 *
 * Business flow covered by this e2e test:
 *
 * 1. Register and authenticate a customer, admin, and seller.
 * 2. As admin, create an inventory state and a product category.
 * 3. As seller, create a product.
 * 4. As admin, associate the product with the created category.
 * 5. As seller, create a SKU for the product that uses the inventory state.
 * 6. As customer, create a cart.
 * 7. As customer, add a cart item using the created SKU.
 * 8. As the same customer, call GET
 *    /shoppingMall/customer/carts/{cartId}/items/{cartItemId}.
 * 9. Assert that the returned IShoppingMallCartItem structure is valid and
 *    consistent with the created cart item, SKU, and cart.
 */
export async function test_api_cart_item_detail_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "https://customer-join.example.com/",
      referrer: "https://landing.example.com/",
    } satisfies IShoppingMallCustomerJoin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerJoin);

  // 2. Register and authenticate an admin (join already authenticates)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin-join.example.com/",
      referrer: "https://landing.example.com/admin",
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  // 3. As admin, create an inventory state
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: {
          code: "in_stock",
          name: "In Stock",
          description: "Items available for immediate purchase",
          is_purchasable: true,
        } satisfies IShoppingMallSkuInventoryState.ICreate,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  // 4. As admin, create a category
  const categorySlug = `cat-${RandomGenerator.alphaNumeric(8)}`;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: null,
        slug: categorySlug,
        name_en: RandomGenerator.paragraph({ sentences: 2 }),
        description_en: RandomGenerator.paragraph({ sentences: 4 }),
        status: "active",
        sort_order: 1,
        is_leaf: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 5. Register and authenticate a seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller-join.example.com/",
      referrer: "https://landing.example.com/seller",
    } satisfies IShoppingMallSellerAuthJoin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  // 6. As seller, create a product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 5 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: RandomGenerator.paragraph({ sentences: 1 }),
        model_name: RandomGenerator.paragraph({ sentences: 1 }),
        status: "active",
        primary_image_uri: "https://cdn.example.com/product.jpg",
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 7. Switch back to admin and link product to category
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin-login.example.com/",
      referrer: "https://landing.example.com/admin/login",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  const productCategory: IShoppingMallProductCategory =
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
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // 8. Switch to seller and create a SKU for the product
  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller-login.example.com/",
      referrer: "https://landing.example.com/seller/login",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  const skuPrice: number & tags.Minimum<0> = 100;
  const skuOriginalPrice: number & tags.Minimum<0> = 120;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
        barcode: RandomGenerator.alphaNumeric(12),
        status: "active",
        price: skuPrice,
        original_price: skuOriginalPrice,
        inventory_quantity: 50,
        low_stock_threshold: 5,
        shopping_mall_sku_inventory_state_id: inventoryState.id,
        attribute_value_ids: [],
        external_ids: [],
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 9. Switch back to customer and create a cart
  const customerLogin = await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "https://customer-login.example.com/",
      referrer: "https://landing.example.com/login",
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLogin);

  const cartCurrency = "USD";
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {
        actor_type: "customer",
        status: "active",
        currency_code: cartCurrency,
      } satisfies IShoppingMallCart.ICreate,
    });
  typia.assert<IShoppingMallCart>(cart);

  // 10. Create a cart item using the SKU
  const cartItemQuantity = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const createdCartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        shopping_mall_sku_id: sku.id,
        quantity: cartItemQuantity,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert<IShoppingMallCartItem>(createdCartItem);

  // 11. Retrieve the cart item detail as the same customer
  const detail: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.at(connection, {
      cartId: cart.id,
      cartItemId: createdCartItem.id,
    });
  typia.assert<IShoppingMallCartItem>(detail);

  // 12. Business assertions on the detail response
  TestValidator.equals(
    "cart item id should match",
    detail.id,
    createdCartItem.id,
  );

  TestValidator.equals(
    "cart id should match owning cart",
    detail.shopping_mall_cart_id,
    cart.id,
  );

  TestValidator.equals(
    "sku id should match created sku",
    detail.shopping_mall_sku_id,
    sku.id,
  );

  TestValidator.equals(
    "quantity should match the requested quantity",
    detail.quantity,
    createdCartItem.quantity,
  );

  TestValidator.predicate(
    "unit price should be positive",
    detail.unit_price > 0,
  );

  TestValidator.equals(
    "currency code should match cart currency",
    detail.currency_code,
    cart.currency_code ?? cartCurrency,
  );

  // sku summary should be present and consistent
  TestValidator.predicate(
    "sku summary should be present on cart item detail",
    detail.sku !== undefined,
  );

  if (detail.sku !== undefined) {
    TestValidator.equals(
      "sku summary id should match sku id",
      detail.sku.id,
      sku.id,
    );
    TestValidator.equals(
      "sku summary code should match sku code",
      detail.sku.code,
      sku.code,
    );
  }

  // last_validation_status and last_validation_at may be null/undefined.
  // Just assert internal consistency if present.
  if (detail.last_validation_status == null) {
    TestValidator.predicate(
      "when last_validation_status is null, last_validation_at may be null or undefined",
      detail.last_validation_at === null ||
        detail.last_validation_at === undefined,
    );
  } else {
    TestValidator.predicate(
      "when last_validation_status is present, last_validation_at should also be present",
      detail.last_validation_at !== null &&
        detail.last_validation_at !== undefined,
    );
  }
}
