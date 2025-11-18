import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartCheckoutPreview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartCheckoutPreview";
import type { IShoppingMallCartCheckoutPreviewItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartCheckoutPreviewItem";
import type { IShoppingMallCartCheckoutPreviewMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartCheckoutPreviewMessage";
import type { IShoppingMallCartCheckoutPreviewTotals } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartCheckoutPreviewTotals";
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

export async function test_api_cart_checkout_preview_with_validated_cart(
  connection: api.IConnection,
) {
  // Step 1: set up actors (customer, admin, seller)
  // 1-1. Register customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuth);

  const customerEmail = customerAuth.email;
  const customerPassword = customerJoinBody.password;

  // 1-2. Register admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuth);

  const adminEmail = adminAuth.email;
  const adminPassword = adminJoinBody.password;

  // 1-3. Register seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuth);

  const sellerEmail = sellerAuth.email;
  const sellerPassword = sellerJoinBody.password;

  // Step 2: as admin, create a purchasable SKU inventory state
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/landing",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const skuInventoryStateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(8)}`,
    name: "In Stock State",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: skuInventoryStateBody },
    );
  typia.assert<IShoppingMallSkuInventoryState>(skuInventoryState);

  // Step 3: as seller, create a product
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/landing",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productBody = {
    code: `PRD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "Test Brand",
    model_name: "Model X",
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/product-main.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // Step 4: as admin, create a category and link product
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/landing",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const categoryBody = {
    parent_id: null,
    slug: `category-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "Test Category",
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert<IShoppingMallCategory>(category);

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

  // Step 5: as seller, create a SKU for the product
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/landing",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const skuPrice: number & tags.Minimum<0> = 100;
  const skuInventoryQuantity: number & tags.Type<"int32"> & tags.Minimum<0> =
    10 as number & tags.Type<"int32"> & tags.Minimum<0>;

  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    barcode: null,
    status: "active",
    price: skuPrice,
    original_price: skuPrice + 20,
    inventory_quantity: skuInventoryQuantity,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // Step 6: as customer, create cart and add item
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "https://customer.example.com/login",
      referrer: "https://customer.example.com/landing",
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const cartBody = {
    actor_type: "customer",
    status: undefined,
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert<IShoppingMallCart>(cart);

  const quantity: number & tags.Type<"int32"> & tags.Minimum<1> = 2 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const cartItemBody = {
    shopping_mall_sku_id: sku.id,
    quantity,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemBody,
    });
  typia.assert<IShoppingMallCartItem>(cartItem);

  // Step 7: validate cart
  const validationResult: IShoppingMallCartValidationResult =
    await api.functional.shoppingMall.customer.carts.validate(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
    });
  typia.assert<IShoppingMallCartValidationResult>(validationResult);

  TestValidator.predicate("cart validation is valid", validationResult.isValid);
  TestValidator.equals(
    "no blocking errors for validated cart",
    validationResult.blockingErrors.length,
    0,
  );

  // Step 8: checkout preview
  const previewRequestBody = {
    // keep empty to rely on defaults; all fields are optional
  } satisfies IShoppingMallCartCheckoutPreview.IRequest;

  const preview: IShoppingMallCartCheckoutPreview =
    await api.functional.shoppingMall.customer.carts.checkoutPreview.index(
      connection,
      {
        cartId: cart.id as string & tags.Format<"uuid">,
        body: previewRequestBody,
      },
    );
  typia.assert<IShoppingMallCartCheckoutPreview>(preview);

  // Basic structural validations
  TestValidator.equals(
    "checkout preview cart id matches cart",
    preview.cart_id,
    cart.id,
  );

  TestValidator.predicate(
    "checkout preview has at least one item",
    preview.items.length > 0,
  );

  // Find preview item corresponding to created cart item
  const matchedItem: IShoppingMallCartCheckoutPreviewItem | undefined =
    preview.items.find((item) => item.cart_item_id === cartItem.id);

  TestValidator.predicate(
    "matched preview item exists for created cart item",
    !!matchedItem,
  );

  if (!matchedItem) return;

  TestValidator.equals(
    "matched preview item sku id matches",
    matchedItem.sku_id,
    cartItem.shopping_mall_sku_id,
  );
  TestValidator.equals(
    "matched preview item quantity matches",
    matchedItem.quantity,
    cartItem.quantity,
  );

  TestValidator.predicate("unit price is positive", matchedItem.unit_price > 0);
  TestValidator.predicate("line total is positive", matchedItem.line_total > 0);

  const totals = preview.totals;
  TestValidator.predicate("subtotal is non-negative", totals.subtotal >= 0);
  TestValidator.predicate(
    "discount_total is non-negative",
    totals.discount_total >= 0,
  );
  TestValidator.predicate("tax_total is non-negative", totals.tax_total >= 0);
  TestValidator.predicate(
    "shipping_total is non-negative",
    totals.shipping_total >= 0,
  );
  TestValidator.predicate(
    "surcharge_total is non-negative",
    totals.surcharge_total >= 0,
  );
  TestValidator.predicate(
    "payable_total is positive",
    totals.payable_total > 0,
  );

  TestValidator.predicate(
    "allowed_to_checkout is true",
    preview.allowed_to_checkout === true,
  );

  if (preview.messages !== undefined) {
    const hasErrorLevel = preview.messages.some((msg) => msg.level === "error");
    TestValidator.predicate(
      "checkout preview messages contain no error level",
      hasErrorLevel === false,
    );
  }

  // Recompute simple subtotal from preview items and compare with totals.subtotal
  const recomputedSubtotal = preview.items.reduce((sum, item) => {
    const line = item.unit_price * item.quantity;
    return sum + line;
  }, 0);

  const diff = Math.abs(recomputedSubtotal - totals.subtotal);
  TestValidator.predicate(
    "preview subtotal is consistent with item unit prices (within tolerance)",
    diff < 0.01 || diff / (totals.subtotal || 1) < 0.01,
  );
}
