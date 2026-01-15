import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";
export async function test_api_product_tag_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a representative sample of the expected response structure
  const expectedAssociation: IShoppingMallProductTag =
    typia.random<IShoppingMallProductTag>();
  // Mock or simulate the expected response structure
  // Since we can only retrieve but not create, we use typia.random to generate conforming data
  // The system's simulate mode will handle the validation based on the schema
  // Use the available endpoint to retrieve the tag association
  const retrievedAssociation =
    await api.functional.shoppingMall.products.tags.at(connection, {
      productId: expectedAssociation.productId,
      tagId: expectedAssociation.tagId,
    });
  // Validate the retrieved data matches the expected schema structure
  typia.assert(retrievedAssociation);
  // Validate key properties against representative sample
  TestValidator.equals(
    "retrieved tag ID matches expected",
    retrievedAssociation.tagId,
    expectedAssociation.tagId,
  );
  TestValidator.equals(
    "retrieved product ID matches expected",
    retrievedAssociation.productId,
    expectedAssociation.productId,
  );
  TestValidator.equals(
    "retrieved tag name matches expected",
    retrievedAssociation.tag.name,
    expectedAssociation.tag.name,
  );
  TestValidator.equals(
    "retrieved tag slug matches expected",
    retrievedAssociation.tag.slug,
    expectedAssociation.tag.slug,
  );
  TestValidator.equals(
    "retrieved tag category matches expected",
    retrievedAssociation.tag.category,
    expectedAssociation.tag.category,
  );
  TestValidator.equals(
    "retrieved tag usage count matches expected",
    retrievedAssociation.tag.usage_count,
    expectedAssociation.tag.usage_count,
  );
  TestValidator.equals(
    "retrieved product name matches expected",
    retrievedAssociation.product.name,
    expectedAssociation.product.name,
  );
  TestValidator.equals(
    "retrieved product price matches expected",
    retrievedAssociation.product.price,
    expectedAssociation.product.price,
  );
  TestValidator.equals(
    "retrieved product thumbnail URL matches expected",
    retrievedAssociation.product.thumbnail_url,
    expectedAssociation.product.thumbnail_url,
  );
  TestValidator.equals(
    "retrieved product category ID matches expected",
    retrievedAssociation.product.category_id,
    expectedAssociation.product.category_id,
  );
  TestValidator.equals(
    "retrieved product brand ID matches expected",
    retrievedAssociation.product.brand_id,
    expectedAssociation.product.brand_id,
  );
  TestValidator.equals(
    "retrieved product in stock status matches expected",
    retrievedAssociation.product.in_stock,
    expectedAssociation.product.in_stock,
  );
}
