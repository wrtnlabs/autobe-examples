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

export async function test_api_review_detail_owner_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const review = await api.functional.mallPlatform.reviews.at(ownerConnection, {
    reviewId,
  });
  typia.assert(review);
  TestValidator.equals(
    "review id should match requested id",
    review.id,
    reviewId,
  );
  TestValidator.predicate(
    "review rating should be within the allowed range",
    review.rating >= 1 && review.rating <= 5,
  );
  TestValidator.predicate(
    "review content should be nullable string",
    review.content === null || typeof review.content === "string",
  );
  TestValidator.predicate(
    "review created_at should be a non-empty timestamp",
    review.created_at.length > 0,
  );
  TestValidator.predicate(
    "review updated_at should be a non-empty timestamp",
    review.updated_at.length > 0,
  );
  TestValidator.equals(
    "active review should not be deleted",
    review.deleted_at,
    null,
  );
  TestValidator.predicate(
    "review should include linked customer summary",
    review.customer.id.length > 0 &&
      review.customer.email.length > 0 &&
      review.customer.status.length > 0,
  );
  TestValidator.predicate(
    "review should include linked order item summary",
    review.orderItem.id.length > 0 &&
      review.orderItem.status.length > 0 &&
      review.orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "review should include linked product summary",
    review.product.id.length > 0 &&
      review.product.name.length > 0 &&
      review.product.description.length > 0,
  );
  TestValidator.predicate(
    "review response should not expose snapshot history",
    !("snapshots" in review) &&
      !("history" in review) &&
      !("revisions" in review),
  );
}
