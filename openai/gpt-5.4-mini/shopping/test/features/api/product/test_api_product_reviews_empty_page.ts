import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Verifies that the product review endpoint returns an empty page for a product with no active reviews.
 *
 * This test checks the public review feed behavior for an unreviewed product context. It validates that the endpoint responds with a paginated payload instead of an error, and that the empty-state contract reports zero review records and zero pages.
 *
 * The test focuses on the browse-time pagination shape and the no-review edge case. It also ensures the response metadata stays internally consistent when the data array is empty.
 *
 * 1. Calls the public product review listing endpoint.
 * 2. Uses a product identifier and a standard first-page request.
 * 3. Validates that the response contains no review rows.
 * 4. Validates that pagination metadata reports zero records and zero pages.
 */
export async function test_api_product_reviews_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const productConnection: api.IConnection = { host: connection.host };
  const output = await api.functional.mallPlatform.products.reviews.index(
    productConnection,
    {
      productId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        page: 1,
        limit: 10,
        sort: "newest",
      } satisfies IMallPlatformReview.IRequest,
    },
  );
  typia.assert(output);
  TestValidator.equals("empty review data", output.data, []);
  TestValidator.equals("zero review records", output.pagination.records, 0);
  TestValidator.equals("zero review pages", output.pagination.pages, 0);
  TestValidator.equals(
    "current page defaults to one",
    output.pagination.current,
    1,
  );
  TestValidator.equals("limit is preserved", output.pagination.limit, 10);
}
