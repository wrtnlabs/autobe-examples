import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_reviews_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  const productConnection: api.IConnection = { host: connection.host };
  const productId = typia.random<string & tags.Format<"uuid">>();
  const limit = 2;
  const firstPage = await api.functional.mallPlatform.products.reviews.index(
    productConnection,
    {
      productId,
      body: {
        page: 1,
        limit,
      } satisfies IMallPlatformReview.IRequest,
    },
  );
  typia.assert(firstPage);
  const secondPage = await api.functional.mallPlatform.products.reviews.index(
    productConnection,
    {
      productId,
      body: {
        page: 2,
        limit,
      } satisfies IMallPlatformReview.IRequest,
    },
  );
  typia.assert(secondPage);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, limit);
  TestValidator.equals(
    "first page pages",
    firstPage.pagination.pages,
    firstPage.pagination.records === 0
      ? 0
      : Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
  );
  TestValidator.predicate(
    "first page data respects limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, limit);
  TestValidator.predicate(
    "second page data respects limit",
    secondPage.data.length <= secondPage.pagination.limit,
  );
  TestValidator.predicate(
    "page two does not duplicate page one reviews",
    firstPage.data.every((review) =>
      secondPage.data.every((next) => next.id !== review.id),
    ),
  );
  if (firstPage.data.length > 1) {
    TestValidator.predicate(
      "first page reviews are stable by createdAt descending",
      firstPage.data.every(
        (review, index, array) =>
          index === 0 || array[index - 1].createdAt >= review.createdAt,
      ),
    );
  }
}
