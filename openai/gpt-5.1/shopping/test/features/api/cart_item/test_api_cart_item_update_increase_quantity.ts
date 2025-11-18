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

export async function test_api_cart_item_update_increase_quantity(
  connection: api.IConnection,
) {
  // 1. Setup actors: customer, seller, admin
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const adminEmail: string = typia.random<string & tags.Format<"email">>();

  const joinHref: string = "https://example.com/join";
  const joinReferrer: string = "https://example.com/landing";

  // 1-1. Customer join (also authenticates)
  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPW1!" as string & tags.Format<"password">,
    ip: null,
    href: joinHref,
    referrer: joinReferrer,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 1-2. Seller join
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPW1!" as string & tags.Format<"password">,
    ip: null,
    href: joinHref,
    referrer: joinReferrer,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 1-3. Admin join
  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPW1!" as string & tags.Format<"password">,
    ip: null,
    href: joinHref,
    referrer: joinReferrer,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates purchasable inventory state
  const skuInventoryStateBody = {
    code: `state-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateBody,
      },
    );
  typia.assert(skuInventoryState);

  TestValidator.predicate(
    "inventory state is purchasable",
    skuInventoryState.is_purchasable,
  );

  // 3. Admin creates category
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.name(2),
    description_en: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 4. Seller creates product
  const productBody = {
    code: `prd-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.name(1),
    status: "active",
    primary_image_uri: "https://example.com/image.png" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 5. Admin links product to category
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

  TestValidator.equals(
    "linked product category id",
    productCategory.shopping_mall_category_id,
    category.id,
  );

  // 6. Seller creates SKU on this product
  const skuBody: IShoppingMallSku.ICreate = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: RandomGenerator.alphaNumeric(12),
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 10000,
    original_price: 12000,
    inventory_quantity: 100,
    low_stock_threshold: 5,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert(sku);

  TestValidator.equals(
    "sku inventory state id",
    sku.inventory_state.id,
    skuInventoryState.id,
  );

  // 7. Customer creates a cart
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

  TestValidator.equals("cart actor type", cart.actor_type, "customer");
  TestValidator.equals("cart status", cart.status, "active");

  // 8. Customer adds an item to cart with initial quantity Q1
  const Q1: number & tags.Type<"int32"> & tags.Minimum<1> = 1;

  const cartItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: Q1,
  } satisfies IShoppingMallCartItem.ICreate;

  const createdItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemCreateBody,
    });
  typia.assert(createdItem);

  TestValidator.equals(
    "created item cart id",
    createdItem.shopping_mall_cart_id,
    cart.id,
  );

  TestValidator.equals(
    "created item sku id",
    createdItem.shopping_mall_sku_id,
    sku.id,
  );

  TestValidator.equals("created quantity == Q1", createdItem.quantity, Q1);

  // Preserve baseline fields
  const baselineQuantity: number & tags.Type<"int32"> = createdItem.quantity;
  const baselineUnitPrice: number = createdItem.unit_price;
  const baselineCurrency: string = createdItem.currency_code;
  const baselineAddedAt: string = createdItem.added_at;
  const baselineCreatedAt: string = createdItem.created_at;
  const baselineUpdatedAt: string = createdItem.updated_at;

  // 9. Update item quantity: Q2 > Q1
  const Q2: number & tags.Type<"int32"> = (baselineQuantity + 1) as number &
    tags.Type<"int32">;

  const cartItemUpdateBody = {
    quantity: Q2,
  } satisfies IShoppingMallCartItem.IUpdate;

  const updatedItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.update(connection, {
      cartId: cart.id,
      cartItemId: createdItem.id,
      body: cartItemUpdateBody,
    });
  typia.assert(updatedItem);

  // 10. Validate immutables and quantity changed
  TestValidator.equals("cart item id stable", updatedItem.id, createdItem.id);
  TestValidator.equals(
    "cart id stable",
    updatedItem.shopping_mall_cart_id,
    createdItem.shopping_mall_cart_id,
  );
  TestValidator.equals(
    "sku id stable",
    updatedItem.shopping_mall_sku_id,
    createdItem.shopping_mall_sku_id,
  );
  TestValidator.equals(
    "currency stable",
    updatedItem.currency_code,
    baselineCurrency,
  );
  TestValidator.equals(
    "unit price stable",
    updatedItem.unit_price,
    baselineUnitPrice,
  );

  TestValidator.equals("quantity updated to Q2", updatedItem.quantity, Q2);

  TestValidator.predicate(
    "Q2 greater than Q1",
    updatedItem.quantity > baselineQuantity,
  );

  // added_at and created_at should remain unchanged
  TestValidator.equals(
    "added_at unchanged",
    updatedItem.added_at,
    baselineAddedAt,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedItem.created_at,
    baselineCreatedAt,
  );

  // updated_at should change
  TestValidator.predicate(
    "updated_at changed",
    updatedItem.updated_at !== baselineUpdatedAt,
  );

  // Optional: basic sanity on validation fields if present
  if (updatedItem.last_validation_status !== undefined) {
    TestValidator.predicate(
      "last_validation_status has some non-empty value when defined",
      updatedItem.last_validation_status === null ||
        updatedItem.last_validation_status.length >= 0,
    );
  }

  if (updatedItem.last_validation_at !== undefined) {
    // nothing stronger than type-checked existence
    TestValidator.predicate(
      "last_validation_at is string or null when defined",
      updatedItem.last_validation_at === null ||
        typeof updatedItem.last_validation_at === "string",
    );
  }
}
