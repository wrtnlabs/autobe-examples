import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttributeValue";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_sku_attribute_value_creation_duplicate_value_for_same_sku_rejected(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorizedFromJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Seller join
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: typia.random<string & tags.Format<"ipv4">>() satisfies string as string,
    href: "https://seller.shoppingmall.local/join",
    referrer: "https://seller.shoppingmall.local/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorizedFromJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorizedFromJoin);

  // 3. Admin login (actor switch to admin)
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.shoppingmall.local/login",
    referrer: "https://admin.shoppingmall.local/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminAuthorizedFromLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 4. Create category as admin
  const categoryCreateBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphabets(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 5. Switch to seller and create product
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.shoppingmall.local/login",
    referrer: "https://seller.shoppingmall.local/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerAuthorizedFromLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAuthorizedFromLogin);

  const productCreateBody = {
    code: `PRD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri:
      "https://cdn.shoppingmall.local/images/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "product belongs to authenticated seller",
    product.shopping_mall_seller_id,
    sellerAuthorizedFromLogin.id,
  );

  // 6. Switch to admin and link product to category
  const adminAuthorizedForLink: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedForLink);

  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(productCategory);

  TestValidator.equals(
    "product-category link references product",
    productCategory.shopping_mall_product_id,
    product.id,
  );

  // 7. As admin, create a variant attribute for the product
  const productAttributeCreateBody = {
    name: "color",
    display_name: "Color",
    data_type: "string",
    is_variant_dimension: true,
    display_order: 0,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const productAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: productAttributeCreateBody,
      },
    );
  typia.assert(productAttribute);

  TestValidator.equals(
    "attribute belongs to product",
    productAttribute.product.id,
    product.id,
  );

  // 8. Switch to seller and create attribute value under the attribute
  const sellerAuthorizedForAttributeValue: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAuthorizedForAttributeValue);

  const attributeValueCreateBody = {
    value: "RED",
    display_value: "Red",
    display_order: 1,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const attributeValue: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: product.id,
        productAttributeId: productAttribute.id,
        body: attributeValueCreateBody,
      },
    );
  typia.assert(attributeValue);

  TestValidator.equals(
    "attribute value belongs to attribute",
    attributeValue.attribute.id,
    productAttribute.id,
  );

  // 9. Switch to admin and create inventory state
  const adminAuthorizedForInventoryState: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedForInventoryState);

  const inventoryStateCreateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(6)}`,
    name: "In Stock",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateCreateBody,
      },
    );
  typia.assert(inventoryState);

  // 10. Switch back to seller and create SKU referencing the inventory state
  const sellerAuthorizedForSku: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAuthorizedForSku);

  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    barcode: RandomGenerator.alphaNumeric(12),
    status: "active",
    price: 199.99,
    original_price: 249.99,
    inventory_quantity: 10,
    low_stock_threshold: 2,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  TestValidator.equals(
    "sku product matches product",
    sku.product.id,
    product.id,
  );
  TestValidator.equals(
    "sku inventory state matches created state",
    sku.inventory_state.id,
    inventoryState.id,
  );

  // 11. First association call: must succeed
  const firstAssociationBody = {
    shopping_mall_product_attribute_value_id: attributeValue.id,
  } satisfies IShoppingMallSkuAttributeValue.ICreate;

  const skuAttributeValueFirst: IShoppingMallSkuAttributeValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.create(
      connection,
      {
        skuId: sku.id,
        body: firstAssociationBody,
      },
    );
  typia.assert(skuAttributeValueFirst);

  TestValidator.equals(
    "first association uses correct sku id",
    skuAttributeValueFirst.shopping_mall_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "first association uses correct attribute value id",
    skuAttributeValueFirst.shopping_mall_product_attribute_value_id,
    attributeValue.id,
  );

  // 12. Second association call with same value: must fail
  const duplicateAssociationBody = {
    shopping_mall_product_attribute_value_id:
      attributeValue.id satisfies string & tags.Format<"uuid">,
  } satisfies IShoppingMallSkuAttributeValue.ICreate;

  await TestValidator.error(
    "duplicate sku-attribute-value association should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.skus.attributeValues.create(
        connection,
        {
          skuId: sku.id,
          body: duplicateAssociationBody,
        },
      );
    },
  );
}
