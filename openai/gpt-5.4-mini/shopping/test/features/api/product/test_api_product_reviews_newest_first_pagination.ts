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

export async function test_api_product_reviews_newest_first_pagination(
  connection: api.IConnection,
): Promise<void> {
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const request: IMallPlatformReview.IRequest = {
    sort: "newest",
    page: 1,
    limit: 2,
  };
  const response = await api.functional.mallPlatform.products.reviews.index(
    connection,
    {
      productId,
      body: request,
    },
  );
  typia.assert(response);
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    request.page ?? 1,
  );
  TestValidator.equals(
    "pagination limit",
    response.pagination.limit,
    request.limit ?? response.pagination.limit,
  );
  TestValidator.predicate(
    "pagination record count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned data does not exceed requested page size",
    response.data.length <= response.pagination.limit,
  );
  for (const review of response.data) {
    typia.assert(review);
    TestValidator.equals(
      "review belongs to the requested product",
      review.product.id,
      productId,
    );
    TestValidator.predicate(
      "rating is between one and five",
      review.rating >= 1 && review.rating <= 5,
    );
    TestValidator.predicate(
      "created timestamp is present",
      review.created_at.length > 0,
    );
    TestValidator.predicate(
      "updated timestamp is present",
      review.updated_at.length > 0,
    );
    TestValidator.equals(
      "active review is not soft-deleted",
      review.deleted_at,
      null,
    );
    TestValidator.predicate(
      "customer summary is present",
      review.customer.id.length > 0 && review.customer.email.length > 0,
    );
    TestValidator.predicate(
      "order item summary is present",
      review.orderItem.id.length > 0 && review.orderItem.quantity > 0,
    );
    TestValidator.predicate(
      "product summary is present",
      review.product.id.length > 0 && review.product.name.length > 0,
    );
    TestValidator.predicate(
      "deleted-user display rule is preserved when applicable",
      review.customer.deleted_at === null || review.customer.status.length > 0,
    );
  }
  for (let index = 1; index < response.data.length; ++index) {
    TestValidator.predicate(
      "reviews are sorted newest first",
      response.data[index - 1].created_at >= response.data[index].created_at,
    );
  }
}
