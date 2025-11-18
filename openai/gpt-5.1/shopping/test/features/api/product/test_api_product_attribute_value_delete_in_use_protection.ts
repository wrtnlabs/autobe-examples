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

/**
 * Ensure that a product attribute value that is in use by a SKU cannot be
 * deleted by the seller.
 *
 * Business context:
 *
 * - Sellers manage products with variant attributes (e.g., Color, Size).
 * - Concrete attribute values (e.g., "Red", "XL") are bound to SKUs.
 * - Once a SKU references an attribute value, deleting that value should be
 *   rejected to preserve referential integrity and prevent broken SKUs.
 *
 * Steps:
 *
 * 1. Register and authenticate a seller.
 * 2. As seller, create a product.
 * 3. Register and authenticate an admin.
 * 4. As admin, create a category and link it to the product.
 * 5. As admin, create a product attribute under the product.
 * 6. As seller, create an attribute value under that attribute.
 * 7. As seller, create a SKU that references this attribute value via
 *    IShoppingMallSku.ICreate.attribute_value_ids.
 * 8. Attempt to delete the attribute value using the seller DELETE endpoint.
 * 9. Verify that deletion fails with an HTTP error, proving in-use protection.
 */
export async function test_api_product_attribute_value_delete_in_use_protection(
  connection: api.IConnection,
) {
  // 1. Register and authenticate seller
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.example.com`,
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  const sellerEmail = sellerAuthorized.email;
  const sellerPassword = sellerJoinBody.password;

  // 2. As seller, create a product
  const productBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE Test Brand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/product.png" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Register and authenticate admin
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  const adminEmail = adminAuthorized.email;
  const adminPassword = adminJoinBody.password;

  // 4. As admin, create a category and link it to the product
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "AutoBE Test Category",
    description_en: "Category used in attribute value delete protection test",
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
  TestValidator.equals(
    "product category links to correct product",
    productCategory.shopping_mall_product_id,
    product.id,
  );

  // 5. As admin, create a product attribute under the product
  const attributeBody = {
    name: "color",
    display_name: "Color",
    data_type: "string",
    is_variant_dimension: true,
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const attribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        body: attributeBody,
      },
    );
  typia.assert<IShoppingMallProductAttribute>(attribute);
  TestValidator.equals(
    "attribute belongs to correct product",
    attribute.product.id,
    product.id,
  );

  // 6. Switch back to seller context explicitly (admin->seller)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoggedIn);

  // 7. As seller, create an attribute value under that attribute
  const attributeValueBody = {
    value: "RED",
    display_value: "Red",
    display_order: 0 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const attributeValue: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        productAttributeId: attribute.id as string & tags.Format<"uuid">,
        body: attributeValueBody,
      },
    );
  typia.assert<IShoppingMallProductAttributeValue>(attributeValue);
  TestValidator.equals(
    "attribute value links to correct attribute",
    attributeValue.attribute.id,
    attribute.id,
  );

  // 8. As seller, create a SKU that references this attribute value
  // For inventory state, use a random UUID (the test environment may have valid
  // states with random IDs when simulate mode is enabled).
  const skuInventoryStateId = typia.random<string & tags.Format<"uuid">>();

  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    barcode: null,
    status: "active",
    price: 199.99,
    original_price: 249.99,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryStateId,
    attribute_value_ids: [
      attributeValue.id as string & tags.Format<"uuid">,
    ] as (string & tags.Format<"uuid">)[] & tags.MinItems<0>,
    external_ids: [
      {
        system_code: "TEST-SYSTEM",
        external_id: `EXT-${RandomGenerator.alphaNumeric(6)}`,
      },
    ] satisfies IShoppingMallSkuExternalId.ICreate[],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert<IShoppingMallSku>(sku);
  TestValidator.equals(
    "SKU belongs to correct product",
    sku.product.id,
    product.id,
  );

  // 9. Attempt to delete the attribute value; expect failure because it is in use
  await TestValidator.error(
    "deleting an in-use attribute value should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.attributes.values.erase(
        connection,
        {
          productId: product.id as string & tags.Format<"uuid">,
          productAttributeId: attribute.id as string & tags.Format<"uuid">,
          productAttributeValueId: attributeValue.id as string &
            tags.Format<"uuid">,
        },
      );
    },
  );
}
