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
 * Validate soft deletion of a product attribute by an admin.
 *
 * 1. Register admin and authenticate
 * 2. Create a new product as admin
 * 3. Add an attribute to the product as admin
 * 4. Soft-delete the attribute as admin, confirm deleted_at is set and matches
 *    expectations
 */
export async function test_api_product_attribute_soft_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword as string &
          tags.MinLength<8> &
          tags.Format<"password">,
        name: adminName as string & tags.MinLength<1>,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals("admin email matches input", admin.email, adminEmail);
  TestValidator.equals("admin name matches input", admin.name, adminName);

  // 2. Create a new product as admin
  const productBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    default_price: typia.random<number>(),
    business_status: "draft",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);
  TestValidator.equals(
    "product title matches input",
    product.title,
    productBody.title,
  );
  TestValidator.equals(
    "product business status matches input",
    product.business_status,
    productBody.business_status,
  );
  TestValidator.equals(
    "product not deleted initially",
    product.deleted_at,
    null,
  );

  // 3. Add an attribute to the product as admin
  const attrName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 4,
    wordMax: 8,
  });
  const position = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >() satisfies number as number;
  const attributeBody = {
    attribute_name: attrName as string & tags.MinLength<1>,
    position,
  } satisfies IShoppingMallProductAttribute.ICreate;
  const attribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: attributeBody,
      },
    );
  typia.assert(attribute);
  TestValidator.equals(
    "attribute name matches input",
    attribute.attribute_name,
    attributeBody.attribute_name,
  );
  TestValidator.equals(
    "attribute position matches input",
    attribute.position,
    attributeBody.position,
  );
  TestValidator.equals(
    "attribute not deleted initially",
    attribute.deleted_at,
    null,
  );
  TestValidator.equals(
    "attribute belongs to correct product",
    attribute.shopping_mall_product_id,
    product.id,
  );

  // 4. Soft-delete the attribute as admin and verify deleted_at is set
  const erased: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.erase(
      connection,
      {
        productId: product.id,
        attributeId: attribute.id,
      },
    );
  typia.assert(erased);
  TestValidator.equals(
    "deleted attribute id matches original",
    erased.id,
    attribute.id,
  );
  TestValidator.equals(
    "deleted attribute 'deleted_at' is now set",
    typeof erased.deleted_at,
    "string",
  );
  TestValidator.notEquals(
    "deleted_at is not null after deletion",
    erased.deleted_at,
    null,
  );
  TestValidator.equals(
    "attribute name remains after deletion",
    erased.attribute_name,
    attribute.attribute_name,
  );
  TestValidator.equals(
    "attribute position remains after deletion",
    erased.position,
    attribute.position,
  );
  TestValidator.equals(
    "deleted attribute product id remains the same",
    erased.shopping_mall_product_id,
    attribute.shopping_mall_product_id,
  );
}
