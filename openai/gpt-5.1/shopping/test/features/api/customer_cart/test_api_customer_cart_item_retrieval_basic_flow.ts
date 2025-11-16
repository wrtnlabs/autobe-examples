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

/**
 * Validate retrieval of a specific customer cart item after creation.
 *
 * Business goal: Ensure that once a customer has added a SKU to their
 * persistent cart, they can retrieve that cart item by its identifier, scoped
 * by their own cart id, and that the retrieved representation is consistent
 * with the creation response (IDs, quantity, and basic monetary snapshot
 * fields).
 *
 * High-level flow:
 *
 * 1. Register and authenticate a customer.
 * 2. Register and authenticate a platform admin.
 * 3. Register and authenticate a seller.
 * 4. As platform admin, create a brand.
 * 5. As seller, create a seller product.
 * 6. As seller, define a product option type and one option value for realism.
 * 7. As platform admin, create a catalog product that points to the seller and
 *    brand.
 * 8. As platform admin, create an active, purchasable SKU under that product.
 * 9. As customer, create a persistent cart.
 * 10. As customer, add an item referencing the created SKU into that cart.
 * 11. As customer, retrieve that cart item by cartId + cartItemId.
 * 12. Assert invariant relationships and snapshot consistency.
 */
export async function test_api_customer_cart_item_retrieval_basic_flow(
  connection: api.IConnection,
) {
  // 1. Customer joins (registers) and becomes authenticated
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/signup",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  const customerEmail: string = customerAuth.email;
  const customerPassword: string = customerJoinBody.password;

  // 2. Platform admin joins and becomes authenticated
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdminAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuth);

  const platformAdminEmail: string = platformAdminAuth.email;
  const platformAdminPassword: string = platformAdminJoinBody.password;

  // 3. Seller joins and becomes authenticated
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  const sellerEmail: string = sellerAuth.email;
  const sellerPassword: string = sellerJoinBody.password;

  // 4. Switch to platform admin explicitly via login to simulate actor switching
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminLoginAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuth);

  // 5. As platform admin, create a brand
  const brandSlug = `brand-${RandomGenerator.alphaNumeric(8)}`;
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: brandSlug,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 6. As seller, login and create a seller product
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLoginAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuth);

  const sellerId: string & tags.Format<"uuid"> = sellerLoginAuth.id;

  const sellerProductCode = `seller-prod-${RandomGenerator.alphaNumeric(6)}`;
  const sellerProductCreateBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: sellerProductCode as string & tags.MinLength<1>,
    name: `Seller Product ${RandomGenerator.name(1)}` as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductCreateBody,
    });
  typia.assert(sellerProduct);

  // 7. As seller, define an option type and a single option value for realism
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  } satisfies IShoppingMallProductOptionType.ICreate;
  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: sellerProduct.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  const optionValueCreateBody = {
    value: "red",
    display_name: "Red",
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;
  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: sellerProduct.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // 8. Switch back to platform admin and create a catalog product and SKU
  const platformAdminReloginBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/login2",
    referrer: "https://admin.example.com/landing2",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminReloginAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminReloginBody,
    });
  typia.assert(platformAdminReloginAuth);

  const catalogProductCode = `catalog-prod-${RandomGenerator.alphaNumeric(6)}`;
  const catalogProductCreateBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: catalogProductCode as string & tags.MinLength<1>,
    name: `Catalog Product ${RandomGenerator.name(1)}` as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/catalog-product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const catalogProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: catalogProductCreateBody,
      },
    );
  typia.assert(catalogProduct);

  const skuCode = `SKU-${RandomGenerator.alphaNumeric(6)}`;
  const skuCreateBody = {
    code: skuCode,
    name: `Variant ${optionValue.value}`,
    listPrice: 10000,
    salePrice: 8000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: catalogProduct.code,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 9. Switch back to the customer via login (exercise actor switching)
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
    userAgent: "Mozilla/5.0 (test-agent)",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerLoginAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginAuth);

  // 10. Customer creates a persistent cart
  const customerCartCreateBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;
  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: customerCartCreateBody,
      },
    );
  typia.assert(customerCart);

  const customerCartId: string & tags.Format<"uuid"> = customerCart.id;

  // 11. Customer adds an item to the cart referencing the SKU
  const quantity: number & tags.Type<"int32"> & tags.Minimum<1> = 2 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const cartItemCreateBody = {
    skuId: sku.id,
    quantity,
    note: "E2E test line item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const createdCartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId,
        body: cartItemCreateBody,
      },
    );
  typia.assert(createdCartItem);

  // 12. Retrieve the same cart item by cartId + cartItemId
  const retrievedCartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.at(
      connection,
      {
        customerCartId,
        customerCartItemId: createdCartItem.id,
      },
    );
  typia.assert(retrievedCartItem);

  // 13. Invariant validations
  TestValidator.equals(
    "cart item id should match the requested customerCartItemId",
    retrievedCartItem.id,
    createdCartItem.id,
  );

  TestValidator.equals(
    "cart item customerCartId should match the requested cart id",
    retrievedCartItem.customerCartId,
    customerCartId,
  );

  TestValidator.equals(
    "cart item skuId should match the originally used SKU id",
    retrievedCartItem.skuId,
    sku.id,
  );

  TestValidator.equals(
    "cart item quantity should match the creation request",
    retrievedCartItem.quantity,
    quantity,
  );

  // Monetary snapshot checks when present
  if (
    retrievedCartItem.unitPrice !== null &&
    retrievedCartItem.unitPrice !== undefined
  ) {
    TestValidator.predicate(
      "unitPrice, when present, should be non-negative",
      retrievedCartItem.unitPrice >= 0,
    );
  }

  if (
    retrievedCartItem.lineSubtotal !== null &&
    retrievedCartItem.lineSubtotal !== undefined
  ) {
    TestValidator.predicate(
      "lineSubtotal, when present, should be non-negative",
      retrievedCartItem.lineSubtotal >= 0,
    );

    if (
      retrievedCartItem.unitPrice !== null &&
      retrievedCartItem.unitPrice !== undefined
    ) {
      const expectedSubtotal =
        retrievedCartItem.unitPrice * retrievedCartItem.quantity;
      TestValidator.equals(
        "lineSubtotal should equal unitPrice * quantity when both are present",
        retrievedCartItem.lineSubtotal,
        expectedSubtotal,
      );
    }
  }
}
