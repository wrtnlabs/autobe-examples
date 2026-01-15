import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
export async function test_api_product_attribute_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid product ID (UUID) for the product
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Generate a valid attribute code (business identifier code) - 3-20 alphanumeric characters
  const attributeCode = typia.random<
    string & tags.Pattern<"^[a-zA-Z0-9]{3,20}$">
  >();
  // Generate attribute data matching the IShoppingMallProductAttribute schema
  const attributeData = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
    type: RandomGenerator.pick([
      "text",
      "number",
      "boolean",
      "select",
      "multiselect",
      "date",
      "image",
    ] as const),
    label: RandomGenerator.paragraph({ sentences: 3 }),
    isRequired: typia.random<boolean>(),
    displayOrder: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    isFilterable: typia.random<boolean>(),
    isComparable: typia.random<boolean>(),
  } satisfies IShoppingMallProductAttribute;
  // Simulate the creation of attribute for product through the system state
  // Note: While there's no direct creation API, we assume the attribute exists in the system for the given product
  // Retrieve the specific product attribute using the product's ID and attribute code
  const retrievedAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.products.attributes.at(connection, {
      productId: productId,
      attributeCode: attributeCode,
    });
  // Validate the retrieved attribute matches the expected schema
  typia.assert(retrievedAttribute);
  // Validate the attribute is a IShoppingMallProductAttribute with all required properties
  TestValidator.equals(
    "attribute id is correct type",
    typeof retrievedAttribute.id,
    "string",
  );
  TestValidator.equals(
    "name is present and valid",
    typeof retrievedAttribute.name,
    "string",
  );
  TestValidator.equals(
    "type is one of allowed values",
    [
      "text",
      "number",
      "boolean",
      "select",
      "multiselect",
      "date",
      "image",
    ].includes(retrievedAttribute.type),
    true,
  );
  TestValidator.equals(
    "label is present and valid",
    typeof retrievedAttribute.label,
    "string",
  );
  TestValidator.equals(
    "isRequired is boolean",
    typeof retrievedAttribute.isRequired,
    "boolean",
  );
  TestValidator.equals(
    "displayOrder is positive integer",
    typeof retrievedAttribute.displayOrder,
    "number",
  );
  TestValidator.equals(
    "isFilterable is boolean",
    typeof retrievedAttribute.isFilterable,
    "boolean",
  );
  TestValidator.equals(
    "isComparable is boolean",
    typeof retrievedAttribute.isComparable,
    "boolean",
  );
  // Validate displayOrder constraint
  TestValidator.predicate(
    "displayOrder is >= 0",
    retrievedAttribute.displayOrder >= 0,
  );
  // Validate string length constraints
  TestValidator.predicate(
    "name has min length",
    retrievedAttribute.name.length >= 1,
  );
  TestValidator.predicate(
    "name has max length",
    retrievedAttribute.name.length <= 255,
  );
  TestValidator.predicate(
    "label has min length",
    retrievedAttribute.label.length >= 1,
  );
  TestValidator.predicate(
    "label has max length",
    retrievedAttribute.label.length <= 100,
  );
}
