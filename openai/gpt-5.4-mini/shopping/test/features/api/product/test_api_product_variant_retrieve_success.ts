import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Retrieves a live product variant scoped to its parent product.
 *
 * Validates the primary success path for the variant read endpoint by calling the product-scoped variant lookup and asserting that the response conforms to the live variant DTO. The test focuses on the fields that define a variant's current purchasable state, including SKU code, option combination, optional price override, availability state, and lifecycle timestamps.
 *
 * It also verifies that the nested product summary is present and that the response remains limited to the live variant representation required by the endpoint contract.
 *
 * 1. Call the product variant retrieve endpoint with UUID identifiers.
 * 2. Validate the response as a live product variant record.
 * 3. Confirm the nested product summary and core variant fields are populated.
 */
export async function test_api_product_variant_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  const output = await api.functional.mallPlatform.products.variants.at(
    connection,
    {
      productId: typia.random<string & tags.Format<"uuid">>(),
      variantId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert<IMallPlatformProductVariant>(output);
  TestValidator.predicate(
    "variant has nested product summary",
    output.product.id.length > 0 && output.product.name.length > 0,
  );
  TestValidator.predicate("variant has sku code", output.skuCode.length > 0);
  TestValidator.predicate(
    "variant has option values",
    output.optionValues.length > 0,
  );
  TestValidator.equals("variant deletedAt is null", output.deletedAt, null);
}
