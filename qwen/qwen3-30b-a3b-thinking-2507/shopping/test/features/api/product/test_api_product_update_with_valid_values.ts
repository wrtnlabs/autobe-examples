import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_ecommerce_products_create } from "../../../generate/generate_random_ecommerce_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";

export async function test_api_product_update_with_valid_values(
  connection: api.IConnection,
): Promise<void> {
  // Fixed name that's exactly 15 characters long (Product 1234567)
  const baseName = "Product 1234567";
  // Fixed description that's exactly 200 characters long
  const baseDescription =
    "This is a 200-character description for a product update test. It must be exactly 200 characters long to meet the test requirements. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
  // Create product
  const product = await generate_random_ecommerce_products_create(connection, {
    body: {
      name: baseName,
      description: baseDescription,
      basePrice: 29.99,
      categoriesId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", // Valid UUID
    },
  });
  // Update product with valid values
  const updatedName = "Updated Product"; // Exactly 15 characters
  const updatedDescription =
    "This is the updated 200-character description for a product update test. It must be exactly 200 characters long to meet the test requirements. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
  // Ensure description is exactly 200 characters
  const truncatedDescription = updatedDescription.substring(0, 200);
  const updatedProduct = await api.functional.ecommerce.products.update(
    connection,
    {
      productId: product.id,
      body: {
        name: updatedName,
        description: truncatedDescription,
        base_price: 29.99,
      } satisfies IEcommerceProduct.IUpdate,
    },
  );
  typia.assert(updatedProduct);
  // Verify all attributes
  TestValidator.equals("name matches", updatedProduct.name, updatedName);
  TestValidator.equals(
    "description matches",
    updatedProduct.description,
    truncatedDescription,
  );
  TestValidator.equals("base_price matches", updatedProduct.base_price, 29.99);
  TestValidator.predicate(
    "updated_at is present",
    updatedProduct.updated_at != null && updatedProduct.updated_at != undefined,
  );
}
