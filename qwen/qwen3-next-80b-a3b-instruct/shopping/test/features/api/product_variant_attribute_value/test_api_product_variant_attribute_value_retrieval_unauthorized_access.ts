import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallVariantAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttributeValue";
export async function test_api_product_variant_attribute_value_retrieval_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Create unauthenticated connection for guest access
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a random valid attribute value ID using typia.random
  const attributeValueId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Call the endpoint with unauthenticated connection - this should succeed as per design
  const attributeValue: IShoppingMallVariantAttributeValue =
    await api.functional.shoppingMall.product_variants.attribute_values.at(
      guestConnection,
      { valueId: attributeValueId },
    );
  // Validate the response structure with typia.assert - this handles ALL type and format validation
  typia.assert(attributeValue);
  // Verify business constraints that are meaningful for E2E testing
  TestValidator.predicate(
    "attribute value is non-empty",
    attributeValue.value.length > 0,
  );
  TestValidator.predicate(
    "display order is non-negative",
    attributeValue.display_order >= 0,
  );
  TestValidator.predicate(
    "is_active is a boolean",
    typeof attributeValue.is_active === "boolean",
  );
  // If color_code is present, verify it's in valid format
  if (attributeValue.color_code !== undefined) {
    TestValidator.predicate(
      "color_code matches hex format",
      /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/i.test(attributeValue.color_code),
    );
  }
}
