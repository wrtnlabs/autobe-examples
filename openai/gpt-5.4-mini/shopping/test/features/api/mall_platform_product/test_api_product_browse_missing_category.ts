import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_browse_missing_category(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies product browsing rejects an unresolved category scope.
   *
   * This test exercises the catalog browsing endpoint with a categoryId that
   * does not exist. It validates the endpoint's business rule that category
   * filters must resolve to an existing category before any product listing can
   * be returned.
   *
   * 1. Send a browse request using a syntactically valid but non-existent
   *    category UUID.
   * 2. Assert the request fails with a not-found style HTTP/business error.
   * 3. Confirm the endpoint does not produce a paginated product payload.
   */
  const invalidCategoryId = "00000000-0000-0000-0000-000000000000";
  const browserConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "product browsing with missing category should fail",
    [400, 404],
    async () => {
      await api.functional.mallPlatform.products.index(browserConnection, {
        body: {
          categoryId: invalidCategoryId,
          page: 1,
          limit: 10,
        } satisfies IMallPlatformProduct.IRequest,
      });
    },
  );
}
