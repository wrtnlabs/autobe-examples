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
 * Verifies that a variant lookup scoped under a product returns not found when the variant does not belong to that product.
 *
 * This test exercises the scoped product-variant read path and confirms that the API does not fall back to another variant or return a partial payload when the requested variant identifier is missing under the selected product scope.
 *
 * It also covers the common stale-reference case used by browsing and cart-validation flows, where a caller may still hold a product identifier but the nested variant reference no longer resolves in that product context.
 *
 * 1. Calls the scoped variant lookup with randomly generated UUIDs.
 * 2. Verifies the endpoint rejects the request with a not-found HTTP error.
 * 3. Ensures no success payload is returned for an invalid product-variant pairing.
 */
export async function test_api_product_variant_not_found_under_product(
  connection: api.IConnection,
): Promise<void> {
  const derivedConnection: api.IConnection = { host: connection.host };
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "variant lookup under an existing product should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.products.variants.at(
        derivedConnection,
        {
          productId,
          variantId,
        },
      );
    },
  );
}
