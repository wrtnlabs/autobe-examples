import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_reviews_exclude_deleted_reviews(
  connection: api.IConnection,
): Promise<void> {
  const reviewConnection: api.IConnection = { host: connection.host };
  const response = await api.functional.mallPlatform.products.reviews.index(
    reviewConnection,
    {
      productId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        page: 1,
        limit: 10,
      } satisfies IMallPlatformReview.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination record count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "all returned reviews are active",
    response.data.every((review) => review.deleted_at === null),
  );
  TestValidator.predicate(
    "reviews are sorted newest first",
    response.data.every(
      (review, index, array) =>
        index === 0 ||
        new Date(array[index - 1].created_at).getTime() >=
          new Date(review.created_at).getTime(),
    ),
  );
}
