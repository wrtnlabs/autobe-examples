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

export async function test_api_product_attribute_value_update_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register and authenticate seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = RandomGenerator.alphaNumeric(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/signup",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. As seller, create a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    summary: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 10,
    }),
    brand: "AutoBE Test Brand",
    model_name: "Model-" + RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/" + RandomGenerator.alphaNumeric(16),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productCreateBody },
  );
  typia.assert<IShoppingMallProduct>(product);

  // 3. Register and authenticate admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 4. As admin, create a category
  const categoryCreateBody = {
    parent_id: null,
    slug: `test-category-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "Test Category for Attribute Value Update",
    description_en: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 10,
    }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: categoryCreateBody },
  );
  typia.assert<IShoppingMallCategory>(category);

  // 5. As admin, associate product with category
  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // 6. As admin, create a product attribute for the product
  const attributeCreateBody = {
    name: `color-${RandomGenerator.alphabets(5)}`,
    display_name: "Color",
    data_type: "string",
    is_variant_dimension: true,
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const attribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        body: attributeCreateBody,
      },
    );
  typia.assert<IShoppingMallProductAttribute>(attribute);

  // 7. Switch back to seller context explicitly via login
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/dashboard",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  // 8. As seller, create an initial attribute value
  const initialValueCreateBody = {
    value: "RED",
    display_value: "Red",
    display_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const initialValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        productAttributeId: attribute.id as string & tags.Format<"uuid">,
        body: initialValueCreateBody,
      },
    );
  typia.assert<IShoppingMallProductAttributeValue>(initialValue);

  // 9. Update the attribute value via PUT endpoint under test
  const updatedDisplayValue = "Dark Red";
  const updatedDisplayOrder = 10 as number & tags.Type<"int32">;

  const updateBody = {
    display_value: updatedDisplayValue,
    display_order: updatedDisplayOrder,
  } satisfies IShoppingMallProductAttributeValue.IUpdate;

  const updatedValue =
    await api.functional.shoppingMall.seller.products.attributes.values.update(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        productAttributeId: attribute.id as string & tags.Format<"uuid">,
        productAttributeValueId: initialValue.id as string &
          tags.Format<"uuid">,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallProductAttributeValue>(updatedValue);

  // 10. Business validations using TestValidator

  // id should remain the same
  TestValidator.equals(
    "attribute value id remains stable after update",
    updatedValue.id,
    initialValue.id,
  );

  // attribute relation should remain the same
  TestValidator.equals(
    "attribute relation id remains the same",
    updatedValue.attribute.id,
    initialValue.attribute.id,
  );

  // display_value should be updated
  TestValidator.equals(
    "display_value updated correctly",
    updatedValue.display_value,
    updatedDisplayValue,
  );
  TestValidator.notEquals(
    "display_value differs from original",
    updatedValue.display_value,
    initialValue.display_value,
  );

  // display_order should be updated
  TestValidator.equals(
    "display_order updated correctly",
    updatedValue.display_order,
    updatedDisplayOrder,
  );
  TestValidator.notEquals(
    "display_order differs from original",
    updatedValue.display_order,
    initialValue.display_order,
  );

  // created_at should remain unchanged
  TestValidator.equals(
    "created_at remains unchanged after update",
    updatedValue.created_at,
    initialValue.created_at,
  );

  // updated_at should be greater than or equal to original updated_at
  const initialUpdatedAt = new Date(initialValue.updated_at).getTime();
  const afterUpdatedAt = new Date(updatedValue.updated_at).getTime();

  TestValidator.predicate(
    "updated_at is not earlier than original updated_at",
    afterUpdatedAt >= initialUpdatedAt,
  );
}
