import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates enforcement of business rules when an admin attempts invalid
 * updates, such as renaming the attribute to a duplicate name or setting
 * display order outside allowed values. The scenario begins with admin
 * registration, product and attribute creation, and then an attempted update
 * with invalid data. The expected result is rejection with descriptive business
 * error(s), ensuring attribute name uniqueness per product and validation
 * constraints are enforced. The test will ensure that after registering as an
 * admin and creating a product and two attributes, updating an attribute with a
 * name that duplicates another attribute for the same product, or using an
 * invalid position (e.g., negative), is rejected with business validation
 * errors. All fields and setup will strictly adhere to the provided DTOs. The
 * flow is: 1) register admin, 2) create product, 3) create attribute1, 4)
 * create attribute2 (different name), 5) attempt to update attribute1 with
 * duplicate name (should fail), 6) attempt to update attribute1 with invalid
 * position (should fail). Both error scenarios must be validated.
 */
export async function test_api_product_attribute_update_by_admin_with_invalid_data(
  connection: api.IConnection,
) {
  // 1. Register as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10) + "A1!";
  const adminName = RandomGenerator.name();
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 2. Create product
  const productBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    default_price: 10000,
    business_status: RandomGenerator.pick([
      "draft",
      "published",
      "archived",
      "blocked",
      "pending_approval",
    ] as const),
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 3. Create first attribute
  const attributeName1 = "Color" + RandomGenerator.alphabets(4);
  const attribute1Body = {
    attribute_name: attributeName1,
    position: 0,
  } satisfies IShoppingMallProductAttribute.ICreate;
  const attribute1: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: attribute1Body,
      },
    );
  typia.assert(attribute1);

  // 4. Create second attribute with a different name
  const attributeName2 = "Size" + RandomGenerator.alphabets(4);
  const attribute2Body = {
    attribute_name: attributeName2,
    position: 1,
  } satisfies IShoppingMallProductAttribute.ICreate;
  const attribute2: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: attribute2Body,
      },
    );
  typia.assert(attribute2);

  // 5. Attempt to update first attribute with the duplicate name (should fail)
  await TestValidator.error(
    "should not allow duplicate attribute_name for the same product",
    async () => {
      await api.functional.shoppingMall.admin.products.attributes.update(
        connection,
        {
          productId: product.id,
          attributeId: attribute1.id,
          body: {
            attribute_name: attributeName2, // duplicate name
            position: attribute1.position,
          } satisfies IShoppingMallProductAttribute.IUpdate,
        },
      );
    },
  );

  // 6. Attempt to update first attribute with invalid position (should fail)
  await TestValidator.error(
    "should not allow negative position for attribute",
    async () => {
      await api.functional.shoppingMall.admin.products.attributes.update(
        connection,
        {
          productId: product.id,
          attributeId: attribute1.id,
          body: {
            attribute_name: attribute1.attribute_name,
            position: -1 as number & tags.Type<"int32">,
          } satisfies IShoppingMallProductAttribute.IUpdate,
        },
      );
    },
  );
}
