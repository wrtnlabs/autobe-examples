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
 * Validate uniqueness enforcement when updating product attribute values.
 *
 * Business goal: Ensure that when a seller attempts to update the canonical
 * `value` of a product attribute value to a key that already exists on another
 * value of the same attribute, the backend rejects the operation (via an error)
 * and preserves the non-conflicting configuration, while still allowing
 * subsequent non-conflicting updates.
 *
 * High-level flow:
 *
 * 1. Register and authenticate both an admin and a seller.
 * 2. As seller, create a product.
 * 3. As admin, create a category and link the product into it.
 * 4. As admin, create a `color` attribute for the product.
 * 5. As seller, create two attribute values: RED and BLUE.
 * 6. As seller, attempt to update BLUE's canonical value to RED and assert that
 *    the API call fails (error thrown) due to uniqueness enforcement.
 * 7. As seller, perform a follow-up successful update to a unique value (e.g.,
 *    GREEN) to confirm that valid updates still succeed.
 */
export async function test_api_product_attribute_value_update_validation_conflict(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin#" + RandomGenerator.alphaNumeric(8),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://landing.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Seller#" + RandomGenerator.alphaNumeric(8),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://landing.example.com/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3. Seller creates a product
  const sellerProductBody = {
    code: "PRD-" + RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "Brand-" + RandomGenerator.alphabets(5),
    model_name: "Model-" + RandomGenerator.alphaNumeric(4),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/" +
      RandomGenerator.alphaNumeric(12) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductBody,
    });
  typia.assert(product);

  // 4. Admin logs in explicitly (switch back to admin actor)
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://landing.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 5. Admin creates a category
  const categoryBody = {
    parent_id: null,
    slug: "cat-" + RandomGenerator.alphaNumeric(8),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 6. Admin links product to category
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
  TestValidator.equals(
    "product-category link has correct product id",
    productCategory.shopping_mall_product_id,
    product.id,
  );

  // 7. Admin creates a product attribute (e.g., color)
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
  typia.assert(attribute);
  TestValidator.equals(
    "attribute belongs to created product",
    attribute.product.id,
    product.id,
  );

  // 8. Seller logs in (switch to seller)
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://landing.example.com/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 9. Seller creates first attribute value: RED
  const redValueBody = {
    value: "RED",
    display_value: "Red",
    display_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const redValue: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        productAttributeId: attribute.id as string & tags.Format<"uuid">,
        body: redValueBody,
      },
    );
  typia.assert(redValue);

  TestValidator.equals(
    "first attribute value canonical key is RED",
    redValue.value,
    "RED",
  );
  TestValidator.equals(
    "first attribute value display is Red",
    redValue.display_value,
    "Red",
  );

  // 10. Seller creates second attribute value: BLUE
  const blueValueBody = {
    value: "BLUE",
    display_value: "Blue",
    display_order: 2 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const blueValue: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        productAttributeId: attribute.id as string & tags.Format<"uuid">,
        body: blueValueBody,
      },
    );
  typia.assert(blueValue);

  TestValidator.equals(
    "second attribute value canonical key is BLUE",
    blueValue.value,
    "BLUE",
  );
  TestValidator.equals(
    "second attribute value display is Blue",
    blueValue.display_value,
    "Blue",
  );
  TestValidator.notEquals(
    "two attribute values must have different ids",
    redValue.id,
    blueValue.id,
  );

  // 11. Attempt conflicting update: change BLUE -> RED, expecting error
  const conflictingUpdateBody = {
    value: "RED",
  } satisfies IShoppingMallProductAttributeValue.IUpdate;

  await TestValidator.error(
    "updating BLUE value to existing RED canonical key should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.attributes.values.update(
        connection,
        {
          productId: product.id as string & tags.Format<"uuid">,
          productAttributeId: attribute.id as string & tags.Format<"uuid">,
          productAttributeValueId: blueValue.id as string & tags.Format<"uuid">,
          body: conflictingUpdateBody,
        },
      );
    },
  );

  // 12. Follow-up successful, non-conflicting update: BLUE -> GREEN
  const nonConflictingUpdateBody = {
    value: "GREEN",
    display_value: "Green",
  } satisfies IShoppingMallProductAttributeValue.IUpdate;

  const updatedBlueValue: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.update(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        productAttributeId: attribute.id as string & tags.Format<"uuid">,
        productAttributeValueId: blueValue.id as string & tags.Format<"uuid">,
        body: nonConflictingUpdateBody,
      },
    );
  typia.assert(updatedBlueValue);

  TestValidator.equals(
    "non-conflicting update changes value to GREEN",
    updatedBlueValue.value,
    "GREEN",
  );
  TestValidator.equals(
    "non-conflicting update changes display_value to Green",
    updatedBlueValue.display_value,
    "Green",
  );
}
