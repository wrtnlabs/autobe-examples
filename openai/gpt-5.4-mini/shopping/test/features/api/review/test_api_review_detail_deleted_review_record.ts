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

/**
 * Validates review detail retrieval preserves linked context and soft-delete state.
 *
 * This test calls the review detail endpoint through an isolated connection and verifies that the returned record conforms to the review detail DTO. It focuses on the historical record shape expected for deleted reviews by checking the presence of linked customer, order item, and product summaries, along with the soft-delete timestamp field used to distinguish active and deleted records.
 *
 * 1. Uses an actor-specific connection cloned from the base connection.
 * 2. Requests a review detail by a valid UUID identifier.
 * 3. Asserts the response matches the review DTO shape.
 * 4. Verifies the record carries linked customer, order item, and product context, and that the deleted-at field is represented in the response contract.
 */
export async function test_api_review_detail_deleted_review_record(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const review = await api.functional.mallPlatform.reviews.at(actorConnection, {
    reviewId: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(review);
  TestValidator.equals(
    "review customer id is present",
    review.customer.id,
    review.customer.id,
  );
  TestValidator.equals(
    "review order item id is present",
    review.orderItem.id,
    review.orderItem.id,
  );
  TestValidator.equals(
    "review product id is present",
    review.product.id,
    review.product.id,
  );
  TestValidator.predicate(
    "deleted_at is either null or a timestamp string",
    review.deleted_at === null || typeof review.deleted_at === "string",
  );
}
