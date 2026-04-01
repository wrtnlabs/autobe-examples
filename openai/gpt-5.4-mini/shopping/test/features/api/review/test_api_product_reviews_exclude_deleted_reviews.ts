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

export async function test_api_product_reviews_exclude_deleted_reviews(
  connection: api.IConnection,
): Promise<void> {
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const request: IMallPlatformReview.IRequest = {
    productId,
    page: 1,
    limit: 10,
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
    "pagination page is first page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is preserved",
    response.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records matches visible data length on a single page response",
    response.data.length <= response.pagination.limit,
    true,
  );
  TestValidator.equals(
    "all reviews belong to the requested product",
    response.data.every((review) => review.product.id === productId),
    true,
  );
  TestValidator.equals(
    "deleted reviews are excluded from the active review list",
    response.data.every((review) => review.deletedAt === null),
    true,
  );
  TestValidator.equals(
    "reviews are ordered newest first",
    response.data.every(
      (review, index, array) =>
        index === 0 || array[index - 1].createdAt >= review.createdAt,
    ),
    true,
  );
  TestValidator.equals(
    "pages value matches pagination math",
    response.pagination.pages,
    response.pagination.limit === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit),
  );
}
