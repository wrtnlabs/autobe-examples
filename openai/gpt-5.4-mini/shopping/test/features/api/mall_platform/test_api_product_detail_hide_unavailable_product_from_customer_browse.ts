import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Verifies that hidden or unavailable products are not exposed through customer browse access.
 *
 * This test exercises the customer-facing product detail endpoint against a product identifier that is not expected to be visible in normal browsing flows. It confirms the API rejects access with an HTTP error instead of returning product data for deleted, hidden, or otherwise unavailable records.
 *
 * Because this endpoint is read-only and no mutation or snapshot endpoints are available in the scenario, the test also preserves the no-side-effect requirement by limiting itself to a single retrieval attempt and validating the failure outcome only.
 *
 * 1. Create an isolated customer-facing connection from the base connection.
 * 2. Request a random UUID product identifier through the product detail endpoint.
 * 3. Assert that unavailable product access fails with an HTTP error.
 */
export async function test_api_product_detail_hide_unavailable_product_from_customer_browse(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const productId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "hidden or unavailable product should not be exposed to customer browse access",
    [400, 401, 403, 404, 410],
    async () => {
      await api.functional.mallPlatform.products.at(customerConnection, {
        productId,
      });
    },
  );
}
