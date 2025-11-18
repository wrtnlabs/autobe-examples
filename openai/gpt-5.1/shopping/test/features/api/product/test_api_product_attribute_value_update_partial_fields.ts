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

/**
 * Validate partial update semantics for product attribute value updates.
 *
 * ## Business objective
 *
 * When a seller updates an existing product attribute value using PUT
 * /shoppingMall/seller/products/{productId}/attributes/{productAttributeId}/values/{productAttributeValueId}
 * with a request payload shaped by IShoppingMallProductAttributeValue.IUpdate,
 * they should be able to send only a subset of fields (e.g. only display_value)
 * and have all unspecified fields remain unchanged. Only the provided fields
 * should be modified and updated_at should be refreshed while id and created_at
 * stay stable.
 *
 * ## End-to-end workflow
 *
 * 1. Create and authenticate a seller
 *
 *    - Call api.functional.auth.seller.join with
 *         IShoppingMallSellerAuthJoin.IRequest.
 *    - Connection.headers.Authorization is automatically set with the seller token
 *         by the SDK.
 * 2. Create a product as the seller
 *
 *    - Call api.functional.shoppingMall.seller.products.create with a realistic
 *         IShoppingMallProduct.ICreate body (code, title, summary, description,
 *         etc.).
 *    - Capture product.id as productId.
 * 3. Create and authenticate an admin
 *
 *    - Call api.functional.auth.admin.join with IShoppingMallAdminJoin.ICreate.
 *    - Connection.headers.Authorization is switched to the admin token.
 * 4. Create a category and link it to the product (admin context)
 *
 *    - Call api.functional.shoppingMall.admin.categories.create with
 *         IShoppingMallCategory.ICreate.
 *    - Call api.functional.shoppingMall.admin.products.categories.create with
 *         productId and IShoppingMallProductCategory.ICreate. This step is
 *         mainly to establish a realistic catalog state.
 * 5. Create a product attribute for the product (admin context)
 *
 *    - Call api.functional.shoppingMall.admin.products.attributes.create with
 *         productId and IShoppingMallProductAttribute.ICreate.
 *    - Capture attribute.id as productAttributeId.
 * 6. Switch back to seller and create an initial attribute value
 *
 *    - Login again as the seller using api.functional.auth.seller.login with
 *         IShoppingMallSellerAuthLogin.IRequest so that the connection holds a
 *         seller token.
 *    - Call api.functional.shoppingMall.seller.products.attributes.values.create
 *         with (productId, productAttributeId) and
 *         IShoppingMallProductAttributeValue.ICreate body, explicitly
 *         providing:
 *
 *         - Value (canonical key),
 *         - Display_value (human-friendly label),
 *         - Display_order (int32).
 *    - Capture the returned IShoppingMallProductAttributeValue as originalValue.
 * 7. Perform a partial update on the attribute value (seller context)
 *
 *    - Call api.functional.shoppingMall.seller.products.attributes.values.update
 *         with:
 *
 *         - ProductId, productAttributeId, productAttributeValueId,
 *         - Body: { display_value: "Crimson" } satisfying
 *                   IShoppingMallProductAttributeValue.IUpdate.
 *    - Capture the response as updatedValue.
 * 8. Validate partial update semantics
 *
 *    - Use typia.assert on originalValue and updatedValue.
 *    - With TestValidator, assert that:
 *
 *         - Id is unchanged.
 *         - Attribute summary is unchanged.
 *         - Value is unchanged.
 *         - Display_order is unchanged.
 *         - Display_value is updated to the new label.
 *         - Created_at is unchanged.
 *         - Updated_at has changed (not equal) and is later or at least different from
 *                   the original updated_at.
 *         - Deleted_at remains the same (typically null).
 *    - Optionally, compare the two objects to ensure the only field-level
 *         differences are display_value and updated_at.
 */
export async function test_api_product_attribute_value_update_partial_fields(
  connection: api.IConnection,
) {
  // 1. Seller joins (self-registration) and becomes authenticated
  const sellerJoinRequest = {
    email: `seller+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://seller-portal.example.com/join",
    referrer: "https://landing.example.com/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Seller creates a product
  const productCreateBody = {
    code: `CODE-${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    summary: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 3,
      wordMax: 8,
    }),
    brand: "AutoBE Test Brand",
    model_name: RandomGenerator.alphaNumeric(10),
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/product.png",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Admin joins and becomes authenticated (connection now holds admin token)
  const adminJoinRequest = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin-portal.example.com/join",
    referrer: "https://admin-landing.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 4. Admin creates a category and links product to it
  const categoryCreateBody = {
    parent_id: null,
    slug: `category-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "AutoBE Test Category",
    description_en: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 8,
    }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

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
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // 5. Admin defines a product attribute
  const attributeCreateBody = {
    name: "color",
    display_name: "Color",
    data_type: "string",
    is_variant_dimension: true,
    display_order: 0,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const attribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: attributeCreateBody,
      },
    );
  typia.assert<IShoppingMallProductAttribute>(attribute);

  // 6. Switch back to seller by logging in again
  const sellerLoginRequest = {
    email: sellerJoinRequest.email,
    password: sellerJoinRequest.password,
    ip: null,
    href: "https://seller-portal.example.com/login",
    referrer: "https://seller-portal.example.com/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoggedIn);

  // Seller creates an initial attribute value
  const canonicalValue = "RED-001";
  const initialDisplayValue = "Red";
  const initialDisplayOrder = 10 as number & tags.Type<"int32">;

  const attributeValueCreateBody = {
    value: canonicalValue,
    display_value: initialDisplayValue,
    display_order: initialDisplayOrder,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const originalValue: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: product.id,
        productAttributeId: attribute.id,
        body: attributeValueCreateBody,
      },
    );
  typia.assert<IShoppingMallProductAttributeValue>(originalValue);

  // 7. Perform a partial update: only change display_value
  const updatedDisplayValue = "Crimson";

  const partialUpdateBody = {
    display_value: updatedDisplayValue,
  } satisfies IShoppingMallProductAttributeValue.IUpdate;

  const updatedValue: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.update(
      connection,
      {
        productId: product.id,
        productAttributeId: attribute.id,
        productAttributeValueId: originalValue.id,
        body: partialUpdateBody,
      },
    );
  typia.assert<IShoppingMallProductAttributeValue>(updatedValue);

  // 8. Validate partial update semantics
  // id remains the same
  TestValidator.equals(
    "attribute value id should remain unchanged after partial update",
    updatedValue.id,
    originalValue.id,
  );

  // attribute summary remains the same
  TestValidator.equals(
    "attribute summary should remain unchanged after partial update",
    updatedValue.attribute,
    originalValue.attribute,
  );

  // value (canonical key) is unchanged
  TestValidator.equals(
    "canonical value should remain unchanged when not provided in update payload",
    updatedValue.value,
    originalValue.value,
  );

  // display_order is unchanged
  TestValidator.equals(
    "display_order should remain unchanged when omitted in update payload",
    updatedValue.display_order,
    originalValue.display_order,
  );

  // display_value is updated
  TestValidator.equals(
    "display_value should be updated to the new label",
    updatedValue.display_value,
    updatedDisplayValue,
  );

  // created_at is unchanged
  TestValidator.equals(
    "created_at should remain unchanged after partial update",
    updatedValue.created_at,
    originalValue.created_at,
  );

  // updated_at must differ (refreshed)
  TestValidator.notEquals(
    "updated_at should change after partial update",
    updatedValue.updated_at,
    originalValue.updated_at,
  );

  // deleted_at remains unchanged
  TestValidator.equals(
    "deleted_at should remain unchanged after partial update",
    updatedValue.deleted_at,
    originalValue.deleted_at,
  );
}
