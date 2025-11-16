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

export async function test_api_customer_cart_item_retrieval_after_catalog_changes(
  connection: api.IConnection,
) {
  // 1. Register customer and establish authenticated customer session
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

  // 2. Register platform admin for catalog setup
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
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

  // 3. Register seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. As platform admin, create category tree
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
    description: "Primary category tree for all products",
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
  typia.assert(categoryTree);

  // 5. As platform admin, create brand
  const brandSlug = `brand-${RandomGenerator.alphaNumeric(8)}`;
  const brandBody = {
    name: "Snapshot Test Brand",
    slug: brandSlug,
    description: "Brand used for cart snapshot behavior testing",
    logo_uri: "https://cdn.example.com/brand/logo.png" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 6. As seller, create seller product with multi-SKU flag
  const sharedProductCode = `prod-${RandomGenerator.alphaNumeric(10)}`;

  const sellerProductBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: sharedProductCode,
    name: "Snapshot Test Product",
    short_description: "Product for testing cart item snapshot behavior",
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product/primary.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductBody,
    });
  typia.assert(sellerProduct);

  // 7. As platform admin, create platform-admin product with same code
  const adminProductBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: sharedProductCode,
    name: "Snapshot Test Product (Admin)",
    short_description: "Admin-facing product for snapshot test",
    description: sellerProduct.description,
    status: "active",
    is_multi_sku: true,
    primary_image_uri: sellerProduct.primary_image_uri ?? null,
    additional_data: sellerProduct.additional_data ?? null,
  } satisfies IShoppingMallProduct.ICreate;

  const adminProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: adminProductBody,
      },
    );
  typia.assert(adminProduct);

  // 8. As seller, create product option type and value for realism
  const optionTypeBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: sharedProductCode,
        body: optionTypeBody,
      },
    );
  typia.assert(optionType);

  const optionValueBody = {
    value: "red",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: sharedProductCode,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert(optionValue);

  // 9. As platform admin, create the first SKU for this product
  const sku1Code = `sku1-${RandomGenerator.alphaNumeric(6)}`;
  const sku1ListPrice = 10000;
  const sku1SalePrice = 8000;
  const skuCurrency = "KRW";

  const sku1Body = {
    code: sku1Code,
    name: "Snapshot SKU 1",
    listPrice: sku1ListPrice,
    salePrice: sku1SalePrice,
    currency: skuCurrency,
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku1: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: sharedProductCode,
        body: sku1Body,
      },
    );
  typia.assert(sku1);

  // 10. As customer, create a persistent cart
  const cartBody = {
    currency_code: skuCurrency,
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      testName: "cart_item_snapshot_after_catalog_changes",
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
  typia.assert(cart);

  // 11. As customer, add a cart item for sku1
  const quantity: number & tags.Type<"int32"> & tags.Minimum<1> = 2 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const cartItemCreateBody = {
    skuId: sku1.id,
    quantity,
    note: "Initial snapshot item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const createdItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(createdItem);

  const originalItemId = createdItem.id;
  const originalSkuId = createdItem.skuId;
  const originalQuantity = createdItem.quantity;
  const originalUnitPrice = createdItem.unitPrice ?? null;
  const originalLineSubtotal = createdItem.lineSubtotal ?? null;

  // Basic sanity check on lineSubtotal when present
  if (originalUnitPrice !== null && originalLineSubtotal !== null) {
    TestValidator.equals(
      "lineSubtotal should equal unitPrice * quantity on creation",
      originalLineSubtotal,
      originalUnitPrice * originalQuantity,
    );
  }

  // 12. As platform admin, create a second SKU to simulate catalog evolution
  const sku2Code = `sku2-${RandomGenerator.alphaNumeric(6)}`;
  const sku2Body = {
    code: sku2Code,
    name: "Snapshot SKU 2 - Different Price",
    listPrice: 15000,
    salePrice: 12000,
    currency: skuCurrency,
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku2: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: sharedProductCode,
        body: sku2Body,
      },
    );
  typia.assert(sku2);

  // 13. Retrieve the cart item again after catalog changes
  const fetchedItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.at(
      connection,
      {
        customerCartId: cart.id,
        customerCartItemId: originalItemId,
      },
    );
  typia.assert(fetchedItem);

  // 14. Snapshot consistency assertions
  TestValidator.equals(
    "cart item id remains stable",
    fetchedItem.id,
    originalItemId,
  );

  TestValidator.equals(
    "skuId snapshot remains unchanged despite additional SKUs",
    fetchedItem.skuId,
    originalSkuId,
  );

  TestValidator.equals(
    "quantity remains unchanged",
    fetchedItem.quantity,
    originalQuantity,
  );

  // Price snapshot fields should remain as when the item was created
  TestValidator.equals(
    "unitPrice snapshot remains unchanged",
    fetchedItem.unitPrice ?? null,
    originalUnitPrice,
  );

  TestValidator.equals(
    "lineSubtotal snapshot remains unchanged",
    fetchedItem.lineSubtotal ?? null,
    originalLineSubtotal,
  );
}
