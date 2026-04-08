import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_reviews_list_newest_first(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies administrator access and the default newest-first ordering of a product's public review feed.
   *
   * This scenario checks the paginated product review list endpoint for a single product and validates that the response is suitable for product-detail browsing. It focuses on the visible review summaries, pagination metadata, and ordering behavior expected by customer-facing review feeds.
   *
   * 1. Authenticate as an administrator using an isolated connection.
   * 2. Request the review feed for a product with a small page size.
   * 3. Validate the page metadata and the review summary payload.
   * 4. Confirm the visible reviews are ordered newest-first when multiple rows are returned.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongP@ssw0rd1",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.mallPlatform.administrator.products.reviews.index(
      adminConnection,
      {
        productId,
        body: {
          page: 1,
          limit: 20,
          sort: "newest",
        } satisfies IMallPlatformReview.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    output.data.length <= output.pagination.limit,
  );
  TestValidator.predicate(
    "data length does not exceed total records",
    output.data.length <= output.pagination.records,
  );
  for (const review of output.data) {
    TestValidator.equals(
      "review product id matches requested product",
      review.product.id,
      productId,
    );
    TestValidator.predicate("review is active", review.deleted_at === null);
    TestValidator.predicate(
      "review rating in range",
      review.rating >= 1 && review.rating <= 5,
    );
    typia.assert(review.customer);
    typia.assert(review.orderItem);
    typia.assert(review.orderItem.order);
    typia.assert(review.product);
  }
  if (output.data.length >= 2) {
    TestValidator.predicate(
      "reviews sorted newest first",
      output.data[0].created_at >= output.data[1].created_at,
    );
    TestValidator.predicate(
      "updated timestamps exist for newest-first list",
      output.data[0].updated_at.length > 0 &&
        output.data[1].updated_at.length > 0,
    );
  }
}
