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
 * Test that an admin can create a new attribute definition (such as color or
 * size) for any product in the catalog.
 *
 * 1. Register a new platform admin account using POST /auth/admin/join.
 * 2. Admin creates a new product with valid data using POST
 *    /shoppingMall/products.
 * 3. Admin creates a product attribute using POST
 *    /shoppingMall/admin/products/{productId}/attributes.
 * 4. Assert the attribute is correctly linked to the product, validates unique
 *    attribute name and legal position value.
 * 5. Confirm all API responses pass typia.assert and proper business values are
 *    assigned.
 */
export async function test_api_product_attribute_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) + "!A";
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword satisfies string as string, // tags.MinLength<8> & tags.Format<"password">
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Product creation
  const productTitle =
    RandomGenerator.name() + " " + RandomGenerator.alphabets(6);
  const productDescription = RandomGenerator.content({ paragraphs: 2 });
  const productDefaultPrice = 15000;
  const productBusinessStatus = "published";
  const product = await api.functional.shoppingMall.products.create(
    connection,
    {
      body: {
        title: productTitle,
        description: productDescription,
        default_price: productDefaultPrice,
        business_status: productBusinessStatus,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Product attribute creation
  const attributeName = "color";
  const attributePosition = 0;
  const attribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: {
          attribute_name: attributeName,
          position: attributePosition,
        } satisfies IShoppingMallProductAttribute.ICreate,
      },
    );
  typia.assert(attribute);

  // Step 4: Assert linkage and correct assignment
  TestValidator.equals(
    "attribute productId linkage",
    attribute.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "attribute name assignment",
    attribute.attribute_name,
    attributeName,
  );
  TestValidator.equals(
    "attribute position assignment",
    attribute.position,
    attributePosition,
  );

  // Step 5: Attempt duplicate attribute name for uniqueness validation
  await TestValidator.error(
    "duplicate attribute name is rejected",
    async () => {
      await api.functional.shoppingMall.admin.products.attributes.create(
        connection,
        {
          productId: product.id,
          body: {
            attribute_name: attributeName,
            position: attributePosition + 1,
          } satisfies IShoppingMallProductAttribute.ICreate,
        },
      );
    },
  );

  // Step 6: Attempt invalid attribute name (empty string)
  await TestValidator.error("empty attribute name is rejected", async () => {
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: {
          attribute_name: "" as string & tags.MinLength<1>,
          position: attributePosition + 2,
        } satisfies IShoppingMallProductAttribute.ICreate,
      },
    );
  });

  // Step 7: Attempt invalid position (negative value)
  await TestValidator.error("negative position is rejected", async () => {
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: {
          attribute_name: "size",
          position: -1 as number & tags.Type<"int32"> & tags.Minimum<0>,
        } satisfies IShoppingMallProductAttribute.ICreate,
      },
    );
  });
}
