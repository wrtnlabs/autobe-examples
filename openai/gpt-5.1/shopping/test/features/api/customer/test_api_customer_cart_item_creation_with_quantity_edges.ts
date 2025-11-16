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
 * Validate customer cart item creation at quantity edges.
 *
 * Business workflow:
 *
 * 1. Join three actors: customer, seller, platformAdmin, each via their auth join
 *    endpoints.
 * 2. As platformAdmin, create a category tree and brand for catalog
 *    infrastructure.
 * 3. As seller, create a seller product (is_multi_sku=true) that will host option
 *    types/values.
 * 4. As seller, create a product option type and two option values (e.g., S, M).
 * 5. As platformAdmin, create a product (also is_multi_sku=true) and then a SKU
 *    under it that is active and purchasable.
 * 6. As customer, create a persistent customer cart with valid
 *    currency/region/channel.
 * 7. As customer, create two cart items on the same cart using the SKU id:
 *
 *    - Case A: quantity=1.
 *    - Case B: quantity=50.
 * 8. For each created item, assert that:
 *
 *    - Quantity equals the requested quantity.
 *    - SkuId matches the SKU id used.
 *    - CustomerCartId matches the cart id.
 *    - UnitPrice and lineSubtotal, when present, are non-negative.
 * 9. Assert that the two created items have different ids but share the same cart
 *    and SKU linkage.
 */
export async function test_api_customer_cart_item_creation_with_quantity_edges(
  connection: api.IConnection,
) {
  // 1. Create customer via /auth/customer/join
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://customer.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://customer.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuth);

  // 2. Create seller via /auth/seller/join
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuth);

  // 3. Create platform admin via /auth/platformAdmin/join
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminAuth);

  // 4. As platformAdmin, create a category tree
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog",
    description: "Primary category tree for tests",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeBody,
      },
    );
  typia.assert<IShoppingMallCategoryTree>(categoryTree);

  // 5. As platformAdmin, create a brand
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://static.example.com/logo.png" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 6. As seller, create a seller product that will host option types/values
  const sellerProductCode = `seller-${RandomGenerator.alphaNumeric(10)}`;
  const sellerProductBody = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_brand_id: brand.id,
    code: sellerProductCode as string & tags.MinLength<1>,
    name: `Seller Product ${RandomGenerator.name(1)}` as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://static.example.com/product.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductBody,
    });
  typia.assert<IShoppingMallProduct>(sellerProduct);

  // 7. As seller, create an option type for the seller product
  const optionTypeBody = {
    name: "Size",
    display_name: "Size",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: sellerProduct.code,
        body: optionTypeBody,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(optionType);

  // 8. As seller, create two option values (S, M)
  const optionValueSBody = {
    value: "S",
    display_name: "Small",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValueS: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: sellerProduct.code,
        productOptionTypeId: optionType.id,
        body: optionValueSBody,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(optionValueS);

  const optionValueMBody = {
    value: "M",
    display_name: "Medium",
    display_order: 1 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValueM: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: sellerProduct.code,
        productOptionTypeId: optionType.id,
        body: optionValueMBody,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(optionValueM);

  // 9. As platformAdmin, create a platform product and a SKU under it
  const platformProductCode = `admin-${RandomGenerator.alphaNumeric(10)}`;
  const platformProductBody = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_brand_id: brand.id,
    code: platformProductCode as string & tags.MinLength<1>,
    name: `Admin Product ${RandomGenerator.name(1)}` as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri:
      "https://static.example.com/admin-product.png" as string &
        tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const platformProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: platformProductBody,
      },
    );
  typia.assert<IShoppingMallProduct>(platformProduct);

  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    name: `Variant ${optionValueS.value}/${optionValueM.value}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: platformProduct.code,
        body: skuBody,
      },
    );
  typia.assert<IShoppingMallProductSku>(sku);

  // 10. As customer, create a persistent cart
  const cartBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartBody,
      },
    );
  typia.assert<IShoppingMallCustomerCart>(cart);

  // 11. Case A: quantity = 1
  const quantityMin = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const cartItemMinBody = {
    skuId: sku.id,
    quantity: quantityMin,
    note: "min quantity test",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItemMin: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemMinBody,
      },
    );
  typia.assert<IShoppingMallCustomerCartItem>(cartItemMin);

  TestValidator.equals(
    "min quantity item quantity matches requested value",
    cartItemMin.quantity,
    quantityMin,
  );
  TestValidator.equals(
    "min quantity item skuId matches SKU id",
    cartItemMin.skuId,
    sku.id,
  );
  TestValidator.equals(
    "min quantity item cart id matches customer cart id",
    cartItemMin.customerCartId,
    cart.id,
  );
  if (cartItemMin.unitPrice !== null && cartItemMin.unitPrice !== undefined) {
    TestValidator.predicate(
      "min quantity item unitPrice is non-negative",
      cartItemMin.unitPrice >= 0,
    );
  }
  if (
    cartItemMin.lineSubtotal !== null &&
    cartItemMin.lineSubtotal !== undefined
  ) {
    TestValidator.predicate(
      "min quantity item lineSubtotal is non-negative",
      cartItemMin.lineSubtotal >= 0,
    );
  }

  // 12. Case B: quantity = 50 (high but acceptable)
  const quantityHigh = 50 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const cartItemHighBody = {
    skuId: sku.id,
    quantity: quantityHigh,
    note: "high quantity test",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItemHigh: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemHighBody,
      },
    );
  typia.assert<IShoppingMallCustomerCartItem>(cartItemHigh);

  TestValidator.equals(
    "high quantity item quantity matches requested value",
    cartItemHigh.quantity,
    quantityHigh,
  );
  TestValidator.equals(
    "high quantity item skuId matches SKU id",
    cartItemHigh.skuId,
    sku.id,
  );
  TestValidator.equals(
    "high quantity item cart id matches customer cart id",
    cartItemHigh.customerCartId,
    cart.id,
  );
  if (cartItemHigh.unitPrice !== null && cartItemHigh.unitPrice !== undefined) {
    TestValidator.predicate(
      "high quantity item unitPrice is non-negative",
      cartItemHigh.unitPrice >= 0,
    );
  }
  if (
    cartItemHigh.lineSubtotal !== null &&
    cartItemHigh.lineSubtotal !== undefined
  ) {
    TestValidator.predicate(
      "high quantity item lineSubtotal is non-negative",
      cartItemHigh.lineSubtotal >= 0,
    );
  }

  // 13. Ensure the two items are distinct records but share cart and sku
  TestValidator.notEquals(
    "two created cart items should have different ids",
    cartItemMin.id,
    cartItemHigh.id,
  );
  TestValidator.equals(
    "both items share same SKU id",
    cartItemMin.skuId,
    cartItemHigh.skuId,
  );
  TestValidator.equals(
    "both items share same customer cart id",
    cartItemMin.customerCartId,
    cartItemHigh.customerCartId,
  );
}
