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

export async function test_api_product_variant_parent_scope_mismatch(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test strict parent-product scoping for product variant retrieval.
   *
   * Verifies that the variant lookup endpoint does not resolve a variant across
   * product boundaries when the parent product identifier and variant identifier
   * do not belong to the same record scope. The service must reject the lookup
   * as not found instead of returning a variant from another product context.
   *
   * 1. Create an isolated client connection for the read request.
   * 2. Call the variant lookup endpoint with mismatched random product and variant identifiers.
   * 3. Assert that the endpoint responds with a not-found error.
   */
  const readerConnection: api.IConnection = { host: connection.host };
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "variant lookup should fail for mismatched product scope",
    404,
    async () => {
      await api.functional.mallPlatform.products.variants.at(readerConnection, {
        productId,
        variantId,
      });
    },
  );
}
