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
import type { IShoppingMallCartValidationError } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartValidationError";
import type { IShoppingMallCartValidationResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartValidationResult";
import type { IShoppingMallCartValidationWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartValidationWarning";
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
 * Validate the cart validation endpoint in a realistic multi-actor flow.
 *
 * This test wires together admin, seller, and customer actors to exercise POST
 * /shoppingMall/customer/carts/{cartId}/validate:
 *
 * 1. Admin registers and logs in.
 * 2. Admin creates two SKU inventory states: one purchasable and one
 *    non-purchasable (the latter is not directly used because we have no SKU
 *    update API in the SDK, but it matches the original scenario intent).
 * 3. Admin creates a catalog category.
 * 4. Seller registers, logs in, and creates a product.
 * 5. Admin links the product to the category.
 * 6. Seller creates a SKU for that product in the purchasable inventory state.
 * 7. Customer registers, logs in, creates a cart, and adds the SKU as a cart item.
 * 8. Customer calls the cart validation endpoint for that cart.
 *
 * The original scenario described changing the SKU to a non-purchasable state
 * via a PUT endpoint that is not present in the provided SDK. To preserve
 * compilability and stay within available APIs, this test does not flip the SKU
 * state after cart addition. Instead, it focuses on verifying that the
 * validation endpoint:
 *
 * - Returns a well-typed IShoppingMallCartValidationResult.
 * - Uses a cartId matching the validated cart.
 * - Provides a validatedAt timestamp.
 * - Maintains coherence between isValid and blockingErrors (if isValid is true,
 *   blockingErrors must be empty).
 */
export async function test_api_cart_validation_fails_for_unavailable_sku(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoined: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoined);

  const adminEmail = adminJoined.email;
  const adminPassword = adminJoinBody.password;

  // 1-2. Admin login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.shoppingmall.local/login",
    referrer: "https://admin.shoppingmall.local/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogged: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogged);

  // 2. Admin creates two skuInventoryStates
  const purchasableStateBody = {
    code: `purchasable_${RandomGenerator.alphaNumeric(8)}`,
    name: "Purchasable state for test",
    description:
      "State used for SKUs that can be purchased in E2E cart validation test.",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const purchasableState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: purchasableStateBody },
    );
  typia.assert<IShoppingMallSkuInventoryState>(purchasableState);

  const nonPurchasableStateBody = {
    code: `non_purchasable_${RandomGenerator.alphaNumeric(8)}`,
    name: "Non-purchasable state for test",
    description:
      "State used for SKUs that should not be purchasable (not used directly in this test).",
    is_purchasable: false,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const nonPurchasableState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: nonPurchasableStateBody },
    );
  typia.assert<IShoppingMallSkuInventoryState>(nonPurchasableState);

  // 3. Admin creates a category
  const categoryBody = {
    parent_id: null,
    slug: `test-cart-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "E2E Cart Validation Category",
    description_en: "Category for cart validation scenario.",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 4. Seller joins
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.shoppingmall.local/join",
    referrer: "https://seller.shoppingmall.local/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoined: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoined);

  const sellerEmail = sellerJoined.email;
  const sellerPassword = sellerJoinBody.password;

  // 4-2. Seller login
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.shoppingmall.local/login",
    referrer: "https://seller.shoppingmall.local/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogged: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogged);

  // 5. Seller creates a product
  const productBody = {
    code: `P-${RandomGenerator.alphaNumeric(10)}`,
    title: RandomGenerator.name(3),
    summary: RandomGenerator.paragraph({ sentences: 6 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "E2E Test Brand",
    model_name: "Model-Cart-Validation",
    status: "active",
    primary_image_uri:
      "https://cdn.shoppingmall.local/images/test-product.png" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 6. Admin links product to category
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

  // 7. Seller creates a SKU with the purchasable state
  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(10)}`,
    barcode: null,
    status: "active",
    price: 199.99,
    original_price: 249.99,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: purchasableState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 8. Customer joins
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://customer.shoppingmall.local/join",
    referrer: "https://customer.shoppingmall.local/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerJoined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerJoined);

  const customerEmail = customerJoined.email;
  const customerPassword = customerJoinBody.password;

  // 8-2. Customer login
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://customer.shoppingmall.local/login",
    referrer: "https://customer.shoppingmall.local/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLogged: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLogged);

  // 9. Customer creates a cart
  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert<IShoppingMallCart>(cart);

  TestValidator.equals(
    "cart actor_type is customer",
    cart.actor_type,
    "customer",
  );

  // 10. Customer adds cart item
  const cartItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemCreateBody,
    });
  typia.assert<IShoppingMallCartItem>(cartItem);

  TestValidator.equals(
    "cart item belongs to created cart",
    cartItem.shopping_mall_cart_id,
    cart.id as string & tags.Format<"uuid">,
  );

  // 11-12. Validate the cart
  const validation: IShoppingMallCartValidationResult =
    await api.functional.shoppingMall.customer.carts.validate(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
    });
  typia.assert<IShoppingMallCartValidationResult>(validation);

  TestValidator.equals(
    "validation cartId matches cart.id",
    validation.cartId,
    cart.id as string & tags.Format<"uuid">,
  );

  TestValidator.predicate(
    "validatedAt is non-empty string",
    () =>
      typeof validation.validatedAt === "string" &&
      validation.validatedAt.length > 0,
  );

  if (validation.isValid === true) {
    TestValidator.equals(
      "when isValid is true, blockingErrors must be empty",
      validation.blockingErrors,
      [],
    );
  } else {
    TestValidator.predicate(
      "when isValid is false, blockingErrors array should exist",
      () => Array.isArray(validation.blockingErrors),
    );
  }

  TestValidator.predicate("warnings is an array", () =>
    Array.isArray(validation.warnings),
  );
}
