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
 * Validate adding the same SKU to a customer cart multiple times.
 *
 * Business goal: Ensure that when a customer adds the same SKU repeatedly to
 * the same cart via POST /shoppingMall/customer/carts/{cartId}/items, the
 * backend behaves consistently: either merging into a single cart item row or
 * creating multiple rows whose total quantity matches the sum of all
 * add-to-cart requests. Also verify that actor authentication, catalog setup,
 * and monetary data remain coherent throughout the flow.
 *
 * High-level scenario:
 *
 * 1. Admin joins and logs in to configure global catalog metadata.
 * 2. Admin creates a purchasable SKU inventory state.
 * 3. Admin creates a category node for the product taxonomy.
 * 4. Seller joins and logs in, then creates a product.
 * 5. Admin links the product to the category for a valid catalog structure.
 * 6. Seller logs back in to create a SKU under the product, binding it to the
 *    previously created inventory state.
 * 7. Customer joins and logs in.
 * 8. Customer creates a new cart as a customer-owned cart in a fixed currency.
 * 9. Customer calls POST /shoppingMall/customer/carts/{cartId}/items with SKU id
 *    and quantity Q1, and receives cart item A.
 * 10. Customer calls the same endpoint again with the same SKU id and quantity Q2,
 *     and receives cart item B.
 * 11. Analyze A and B:
 *
 *     - If ids are equal, assert merged behavior: B.quantity == Q1 + Q2 and
 *           B.unit_price == A.unit_price.
 *     - If ids differ, assert separate-row behavior: quantities on A and B remain Q1
 *           and Q2 respectively, total quantity A.quantity + B.quantity == Q1 +
 *           Q2, and A.unit_price == B.unit_price.
 * 12. Confirm that all responses conform to their DTOs via typia.assert and that
 *     basic monetary consistency (non-negative unit_price) holds.
 */
export async function test_api_cart_item_creation_with_existing_item_same_sku(
  connection: api.IConnection,
) {
  // 1. Admin join & login: prepare admin actor for inventory state and category
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  // 2. Admin: create a purchasable inventory state
  const inventoryStateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(8)}`,
    name: "In Stock (Purchasable)",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  // 3. Admin: create a category for the product
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 4. Seller join & login: create seller actor
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  // 5. Seller: create a product to host the SKU
  const productBody = {
    code: `P-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 6. Switch to admin to link product to category
  const adminLogin2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin2);

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // 7. Switch back to seller and create a SKU under the product
  const sellerLogin2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin2);

  const basePrice: number & tags.Minimum<0> = typia.random<
    number & tags.Minimum<0>
  >();

  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    barcode: RandomGenerator.alphaNumeric(12),
    status: "active",
    price: basePrice,
    original_price: basePrice,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: undefined,
    external_ids: undefined,
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 8. Customer join & login
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerJoin);

  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLogin);

  // 9. Customer: create a cart
  const cartBody = {
    actor_type: "customer",
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert<IShoppingMallCart>(cart);

  // 10. Add the same SKU twice with quantities Q1 and Q2
  const quantity1: number & tags.Type<"int32"> & tags.Minimum<1> = 1 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const quantity2: number & tags.Type<"int32"> & tags.Minimum<1> = 3 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const cartItemCreateBody1 = {
    shopping_mall_sku_id: sku.id,
    quantity: quantity1,
  } satisfies IShoppingMallCartItem.ICreate;

  const item1: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: cartItemCreateBody1,
    });
  typia.assert<IShoppingMallCartItem>(item1);

  TestValidator.equals(
    "first cart item cart id matches cart.id",
    item1.shopping_mall_cart_id,
    cart.id,
  );
  TestValidator.equals(
    "first cart item sku id matches created sku.id",
    item1.shopping_mall_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "first cart item quantity equals requested Q1",
    item1.quantity,
    quantity1,
  );
  TestValidator.predicate(
    "first cart item unit_price is non-negative",
    item1.unit_price >= 0,
  );

  const cartItemCreateBody2 = {
    shopping_mall_sku_id: sku.id,
    quantity: quantity2,
  } satisfies IShoppingMallCartItem.ICreate;

  const item2: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: cartItemCreateBody2,
    });
  typia.assert<IShoppingMallCartItem>(item2);

  TestValidator.equals(
    "second cart item cart id matches cart.id",
    item2.shopping_mall_cart_id,
    cart.id,
  );
  TestValidator.equals(
    "second cart item sku id matches created sku.id",
    item2.shopping_mall_sku_id,
    sku.id,
  );

  const totalRequested: number = quantity1 + quantity2;

  if (item1.id === item2.id) {
    // Merge behavior: same row updated to combined quantity
    TestValidator.equals(
      "merged cart item quantity equals Q1+Q2",
      item2.quantity,
      totalRequested,
    );
    TestValidator.equals(
      "merged cart item unit_price is stable",
      item2.unit_price,
      item1.unit_price,
    );
  } else {
    // Separate-row behavior: two distinct items for the same SKU
    TestValidator.notEquals(
      "separate rows should have different ids",
      item1.id,
      item2.id,
    );
    TestValidator.equals(
      "first cart item quantity remains Q1",
      item1.quantity,
      quantity1,
    );
    TestValidator.equals(
      "second cart item quantity equals Q2",
      item2.quantity,
      quantity2,
    );
    TestValidator.equals(
      "cart-level total quantity for SKU equals Q1+Q2",
      item1.quantity + item2.quantity,
      totalRequested,
    );
    TestValidator.equals(
      "separate rows share same unit price",
      item1.unit_price,
      item2.unit_price,
    );
  }
}
