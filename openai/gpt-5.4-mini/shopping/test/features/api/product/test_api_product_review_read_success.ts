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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_review_read_success(
  connection: api.IConnection,
): Promise<void> {
  const output = await api.functional.mallPlatform.products.reviews.at(
    connection,
    {
      productId: typia.random<string & tags.Format<"uuid">>(),
      reviewId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert<IMallPlatformReview>(output);
  typia.assert<IMallPlatformCustomer.ISummary>(output.customer);
  typia.assert<IMallPlatformOrderItem.ISummary>(output.orderItem);
  typia.assert<IMallPlatformProduct.ISummary>(output.product);
  TestValidator.predicate("review rating is within range", () => {
    return output.rating >= 1 && output.rating <= 5;
  });
  TestValidator.predicate("review timestamps are present", () => {
    return output.createdAt.length > 0 && output.updatedAt.length > 0;
  });
  TestValidator.equals(
    "review deletedAt is null or timestamp",
    output.deletedAt,
    output.deletedAt,
  );
}
