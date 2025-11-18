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

export async function test_api_cart_item_update_decrease_quantity(
  connection: api.IConnection,
) {
  // 1. Multi-actor authentication setup
  // 1-1. Admin join (creates admin account and authenticates)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 1-2. Admin login (ensure login works and token switching behavior is stable)
  const adminLoginBody = {
    email: admin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 1-3. Seller join
  const sellerJoinEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerJoinEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.shoppingmall.test/join",
    referrer: "https://seller.shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerJoined: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoined);

  // 1-4. Seller login
  const sellerLoginBody = {
    email: sellerJoinEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://seller.shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 1-5. Customer join
  const customerJoinEmail = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerJoinEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerJoined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerJoined);

  // 1-6. Customer login (ensure token set for customer operations)
  const customerLoginBody = {
    email: customerJoinEmail,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shoppingmall.test/login",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 2. Admin configuration: SKU inventory state and category
  // Switch to admin context: login already performed above, token on connection.

  // 2-1. Create purchasable inventory state
  const skuInventoryStateBody = {
    code: `purchasable-${RandomGenerator.alphaNumeric(8)}`,
    name: "Purchasable State",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: skuInventoryStateBody },
    );
  typia.assert(skuInventoryState);

  // 2-2. Create category
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "General Category",
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 3. Seller catalog: product and SKU
  // Seller already logged in, connection token is seller.

  // 3-1. Create product
  const productBody = {
    code: `PRD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE Brand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri:
      "https://cdn.shoppingmall.test/images/product-primary.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 3-2. Link product to category (admin actor)
  const adminReLoginForProductCategoryBody = {
    email: admin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.test/login2",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminReLogged: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminReLoginForProductCategoryBody,
    });
  typia.assert(adminReLogged);

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
  typia.assert(productCategory);

  // 3-3. Create SKU under the product (seller actor)
  const sellerReLoginForSkuBody = {
    email: sellerJoinEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.test/login2",
    referrer: "https://seller.shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerReLogged: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerReLoginForSkuBody,
    });
  typia.assert(sellerReLogged);

  const skuPrice = 1000;
  const skuInventoryQuantity = 50 as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: skuPrice as number & tags.Minimum<0>,
    original_price: null,
    inventory_quantity: skuInventoryQuantity,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: undefined,
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert(sku);

  // 4. Customer cart and initial cart item
  const customerReLoginForCartBody = {
    email: customerJoinEmail,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shoppingmall.test/login2",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerReLogged: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerReLoginForCartBody,
    });
  typia.assert(customerReLogged);

  // 4-1. Create cart header
  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  // 4-2. Create initial cart item with quantity Q_initial > 1
  const initialQuantity = 3 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const cartItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: initialQuantity,
  } satisfies IShoppingMallCartItem.ICreate;
  const initialItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemCreateBody,
    });
  typia.assert(initialItem);

  // Capture baseline values
  const initialItemId = initialItem.id;
  const initialUnitPrice = initialItem.unit_price;
  const initialCurrencyCode = initialItem.currency_code;
  const initialUpdatedAt = initialItem.updated_at;

  TestValidator.equals(
    "initial quantity should equal requested quantity",
    initialItem.quantity,
    initialQuantity,
  );

  // 5. First decrease: Q_lower = Q_initial - 1
  const firstDecreasedQuantity = (initialItem.quantity - 1) as number &
    tags.Type<"int32">;
  const firstUpdateBody = {
    quantity: firstDecreasedQuantity,
  } satisfies IShoppingMallCartItem.IUpdate;
  const firstUpdatedItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.update(connection, {
      cartId: cart.id,
      cartItemId: initialItemId,
      body: firstUpdateBody,
    });
  typia.assert(firstUpdatedItem);

  // Validate first decrease behavior
  TestValidator.equals(
    "first decrease: quantity should be Q_initial - 1",
    firstUpdatedItem.quantity,
    firstDecreasedQuantity,
  );
  TestValidator.equals(
    "first decrease: unit_price should remain unchanged",
    firstUpdatedItem.unit_price,
    initialUnitPrice,
  );
  TestValidator.equals(
    "first decrease: currency_code should remain unchanged",
    firstUpdatedItem.currency_code,
    initialCurrencyCode,
  );
  TestValidator.predicate(
    "first decrease: updated_at should change after update",
    firstUpdatedItem.updated_at !== initialUpdatedAt,
  );

  const expectedLineTotalAfterFirstDecrease =
    initialUnitPrice * firstDecreasedQuantity;
  TestValidator.equals(
    "first decrease: implied line total should match unit_price * quantity",
    expectedLineTotalAfterFirstDecrease,
    initialUnitPrice * firstUpdatedItem.quantity,
  );

  // 6. Boundary decrease to quantity 1
  const boundaryQuantity = 1 as number & tags.Type<"int32">;
  const boundaryUpdateBody = {
    quantity: boundaryQuantity,
  } satisfies IShoppingMallCartItem.IUpdate;
  const boundaryUpdatedItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.update(connection, {
      cartId: cart.id,
      cartItemId: initialItemId,
      body: boundaryUpdateBody,
    });
  typia.assert(boundaryUpdatedItem);

  // Validate boundary behavior
  TestValidator.equals(
    "boundary decrease: quantity should be 1",
    boundaryUpdatedItem.quantity,
    boundaryQuantity,
  );
  TestValidator.equals(
    "boundary decrease: cart item id should remain the same (not deleted)",
    boundaryUpdatedItem.id,
    initialItemId,
  );
  TestValidator.equals(
    "boundary decrease: unit_price should remain unchanged",
    boundaryUpdatedItem.unit_price,
    initialUnitPrice,
  );
  TestValidator.equals(
    "boundary decrease: currency_code should remain unchanged",
    boundaryUpdatedItem.currency_code,
    initialCurrencyCode,
  );
  TestValidator.predicate(
    "boundary decrease: updated_at should change again",
    boundaryUpdatedItem.updated_at !== firstUpdatedItem.updated_at,
  );

  const expectedLineTotalAtBoundary = initialUnitPrice * boundaryQuantity;
  TestValidator.equals(
    "boundary decrease: implied line total should match unit_price * quantity",
    expectedLineTotalAtBoundary,
    initialUnitPrice * boundaryUpdatedItem.quantity,
  );
}
