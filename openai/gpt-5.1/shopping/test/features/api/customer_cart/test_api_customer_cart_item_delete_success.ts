import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
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

export async function test_api_customer_cart_item_delete_success(
  connection: api.IConnection,
) {
  // 1. Register a new customer and obtain authorized session
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 2. Register a seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3. Register a platform admin
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 4. As platformAdmin, create a category tree (not strictly required for SKU but realistic catalog setup)
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
    description: "Primary category tree for tests",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreateBody },
    );
  typia.assert(categoryTree);

  // 5. As platformAdmin, create a brand
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: "Test brand for cart delete scenario",
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 6. As platformAdmin, create a product owned by the seller and associated with the brand
  const productCode = `prd-${RandomGenerator.alphaNumeric(10)}` as string;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Test Product For Cart Deletion",
    short_description: "Short description for cart deletion test product",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productCreateBody },
    );
  typia.assert(product);

  TestValidator.equals(
    "product seller summary id should match sellerAuthorized.id",
    product.seller.id,
    sellerAuthorized.id,
  );

  // 7. As platformAdmin, create a SKU under that product
  const skuCode = `sku-${RandomGenerator.alphaNumeric(10)}`;

  const skuCreateBody = {
    code: skuCode,
    name: "Test SKU for cart item",
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  TestValidator.equals(
    "sku.productCode should match productCode",
    sku.productCode,
    productCode,
  );

  // 8. Switch to customer session (login) to ensure we act as the customer actor
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
    userAgent: "E2E-Test-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoginAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginAuthorized);

  // 9. Create a persistent customer cart
  const cartCreateBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      scenario: "cart_item_delete_success",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: cartCreateBody },
    );
  typia.assert(cart);

  TestValidator.equals(
    "cart.customer.id should match logged-in customer id",
    cart.customer.id,
    customerLoginAuthorized.customer.id,
  );

  TestValidator.equals("cart is_active should be true", cart.is_active, true);

  // Capture pre-item totals for later comparison after delete (indirect consistency check)
  const preItemSubtotal = cart.subtotal_amount;
  const preItemDiscount = cart.discount_amount;
  const preItemShipping = cart.shipping_amount;
  const preItemTotal = cart.total_amount;

  // 10. Add a cart item to the cart using the SKU
  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Item to be deleted in test",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  TestValidator.equals(
    "cartItem.customerCartId should equal cart.id",
    cartItem.customerCartId,
    cart.id,
  );

  TestValidator.equals(
    "cartItem.sku.id should equal requested sku.id",
    cartItem.sku.id,
    sku.id,
  );

  TestValidator.equals(
    "cartItem.quantity should equal requested quantity",
    cartItem.quantity,
    cartItemCreateBody.quantity,
  );

  // 11. Delete the cart item as the same authenticated customer
  await api.functional.shoppingMall.customer.customerCarts.items.erase(
    connection,
    {
      customerCartId: cart.id,
      customerCartItemId: cartItem.id,
    },
  );

  // If erase succeeded without throwing, we proceed.
  // There is no direct read endpoint for cart items, so we validate behavior indirectly
  // by ensuring the cart remains usable (we can add another item) and business invariants hold.

  const secondCartItemCreateBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Item after deletion to prove cart is still usable",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const secondCartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: secondCartItemCreateBody,
      },
    );
  typia.assert(secondCartItem);

  TestValidator.equals(
    "secondCartItem.customerCartId should equal cart.id",
    secondCartItem.customerCartId,
    cart.id,
  );

  TestValidator.equals(
    "secondCartItem.sku.id should equal sku.id",
    secondCartItem.sku.id,
    sku.id,
  );

  TestValidator.predicate(
    "secondCartItem.quantity should be positive",
    secondCartItem.quantity > 0,
  );

  // Business-level invariant: deleting the first item should not break the cart
  // We cannot re-fetch the cart totals, but we can at least confirm the cart
  // that was created earlier had non-negative monetary fields and remains logically valid.
  TestValidator.predicate(
    "preItem monetary totals should be non-negative",
    preItemSubtotal >= 0 &&
      preItemDiscount >= 0 &&
      preItemShipping >= 0 &&
      preItemTotal >= 0,
  );
}
