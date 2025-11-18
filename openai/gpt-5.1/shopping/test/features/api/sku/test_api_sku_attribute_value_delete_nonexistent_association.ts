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
 * Validate behavior when deleting a non-existent or mismatched SKU attribute
 * value association.
 *
 * Business goal
 *
 * - Ensure that DELETE
 *   /shoppingMall/admin/skus/{skuId}/attributeValues/{skuAttributeValueId} does
 *   not accidentally delete associations belonging to a different SKU and
 *   properly returns an error when the association is not found for the given
 *   SKU.
 *
 * High level scenario
 *
 * 1. A seller joins and logs in.
 * 2. An admin joins and logs in.
 * 3. Admin creates a SKU inventory state.
 * 4. Seller creates a product.
 * 5. Admin creates a category and links it to the product.
 * 6. Admin creates a product attribute for that product.
 * 7. Seller creates an attribute value under that attribute.
 * 8. Seller creates two SKUs for the same product, both using the same inventory
 *    state and attribute value.
 * 9. Seller creates one SKU-attribute association per SKU.
 * 10. Admin attempts to delete the association of SKU-A using the association-id of
 *     SKU-B.
 * 11. Verify via TestValidator.error that the delete call fails (404-like not-found
 *     for the given skuId).
 * 12. The test assumes the real association on SKU-A remains intact; no further
 *     read API is required.
 */
export async function test_api_sku_attribute_value_delete_nonexistent_association(
  connection: api.IConnection,
) {
  // 1. Seller joins
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Admin joins
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. Admin creates an inventory state
  const skuInventoryStateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(6)}`,
    name: "In Stock",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  // 4. Switch to seller context explicitly by logging in again
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 5. Seller creates a product
  const productBody = {
    code: `PRD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "BrandX",
    model_name: "ModelY",
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/primary.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 6. Switch back to admin to create category and link
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 7. Admin creates a category
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "Default Category",
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 0 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 8. Admin links product to category
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

  // 9. Admin creates a product attribute
  const productAttributeBody = {
    name: "color" as string & tags.MinLength<1>,
    display_name: "Color" as string & tags.MinLength<1>,
    data_type: "string" as string & tags.MinLength<1>,
    is_variant_dimension: true,
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const productAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        body: productAttributeBody,
      },
    );
  typia.assert(productAttribute);

  // 10. Switch to seller to create attribute value and SKUs
  const sellerLoggedInAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedInAgain);

  // 11. Seller creates a product attribute value
  const attributeValueBody = {
    value: "red",
    display_value: "Red",
    display_order: 0 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const attributeValue: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        productAttributeId: productAttribute.id as string & tags.Format<"uuid">,
        body: attributeValueBody,
      },
    );
  typia.assert(attributeValue);

  // 12. Seller creates first SKU (skuA)
  const skuABody = {
    code: `SKU-A-${RandomGenerator.alphaNumeric(6)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100 as number & tags.Minimum<0>,
    original_price: 120 as number & tags.Minimum<0>,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [attributeValue.id] as (string &
      tags.Format<"uuid">)[] &
      tags.MinItems<0>,
    external_ids: undefined,
  } satisfies IShoppingMallSku.ICreate;

  const skuA: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuABody,
    });
  typia.assert(skuA);

  // 13. Seller creates second SKU (skuB)
  const skuBBody = {
    code: `SKU-B-${RandomGenerator.alphaNumeric(6)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 110 as number & tags.Minimum<0>,
    original_price: 130 as number & tags.Minimum<0>,
    inventory_quantity: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [attributeValue.id] as (string &
      tags.Format<"uuid">)[] &
      tags.MinItems<0>,
    external_ids: undefined,
  } satisfies IShoppingMallSku.ICreate;

  const skuB: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBBody,
    });
  typia.assert(skuB);

  // 14. Seller creates attribute association for skuA
  const skuAAttrAssocBody = {
    shopping_mall_product_attribute_value_id: attributeValue.id,
  } satisfies IShoppingMallSkuAttributeValue.ICreate;

  const skuAAttrAssoc: IShoppingMallSkuAttributeValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.create(
      connection,
      {
        skuId: skuA.id,
        body: skuAAttrAssocBody,
      },
    );
  typia.assert(skuAAttrAssoc);

  // 15. Seller creates attribute association for skuB
  const skuBAttrAssocBody = {
    shopping_mall_product_attribute_value_id: attributeValue.id,
  } satisfies IShoppingMallSkuAttributeValue.ICreate;

  const skuBAttrAssoc: IShoppingMallSkuAttributeValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.create(
      connection,
      {
        skuId: skuB.id,
        body: skuBAttrAssocBody,
      },
    );
  typia.assert(skuBAttrAssoc);

  // 16. Switch back to admin for deletion attempt
  const adminLoggedInAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedInAgain);

  // 17. Attempt to delete skuB's association using skuA's skuId (should fail)
  await TestValidator.error(
    "deleting association with mismatched skuId must fail",
    async () => {
      await api.functional.shoppingMall.admin.skus.attributeValues.erase(
        connection,
        {
          skuId: skuA.id,
          skuAttributeValueId: skuBAttrAssoc.id,
        },
      );
    },
  );

  // 18. Sanity check: the association ids for skuA and skuB differ
  TestValidator.notEquals<
    IShoppingMallSkuAttributeValue,
    IShoppingMallSkuAttributeValue
  >(
    "skuA and skuB attribute associations must be distinct records",
    skuAAttrAssoc,
    skuBAttrAssoc,
  );
}
