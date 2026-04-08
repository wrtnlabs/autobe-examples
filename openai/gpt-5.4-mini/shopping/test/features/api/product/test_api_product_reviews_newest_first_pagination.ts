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

export async function test_api_product_reviews_newest_first_pagination(
  connection: api.IConnection,
): Promise<void> {
  const response = await api.functional.mallPlatform.products.reviews.index(
    connection,
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
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "review feed is newest first",
    (() => {
      for (let i = 1; i < response.data.length; i++) {
        if (response.data[i - 1].created_at < response.data[i].created_at)
          return false;
      }
      return true;
    })(),
  );
  for (const review of response.data) {
    TestValidator.predicate("review has id", review.id.length > 0);
    TestValidator.predicate(
      "review rating within range",
      review.rating >= 1 && review.rating <= 5,
    );
    TestValidator.predicate(
      "review content is nullable string",
      review.content === null || typeof review.content === "string",
    );
    TestValidator.predicate(
      "review has customer summary",
      review.customer.id.length > 0 && review.customer.email.length > 0,
    );
    TestValidator.predicate(
      "review has product summary",
      review.product.id.length > 0 && review.product.name.length > 0,
    );
    TestValidator.predicate(
      "review has timestamps",
      review.created_at.length > 0 && review.updated_at.length > 0,
    );
    TestValidator.predicate(
      "deleted review rows are excluded",
      review.deleted_at === null,
    );
  }
}
