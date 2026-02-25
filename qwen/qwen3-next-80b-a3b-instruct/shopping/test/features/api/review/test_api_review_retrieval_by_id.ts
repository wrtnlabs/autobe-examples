import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_review_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random review ID that matches the UUID format
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the review using the only available endpoint
  const retrievedReview = await api.functional.shoppingMall.reviews.at(
    connection,
    {
      reviewId: reviewId,
    },
  );
  // Validate that the response conforms to IShoppingMallCategory
  typia.assert(retrievedReview);
  // Validate all properties that exist in IShoppingMallCategory
  TestValidator.equals("review id matches", retrievedReview.id, reviewId);
  TestValidator.predicate(
    "email is email format",
    retrievedReview.email !== undefined &&
      typia.is<string & tags.Format<"email">>(retrievedReview.email),
  );
  TestValidator.predicate(
    "display_name is string or undefined",
    retrievedReview.display_name === undefined ||
      typeof retrievedReview.display_name === "string",
  );
  TestValidator.predicate(
    "shop_name is string or undefined",
    retrievedReview.shop_name === undefined ||
      typeof retrievedReview.shop_name === "string",
  );
  TestValidator.predicate(
    "status is valid",
    retrievedReview.status === undefined ||
      ["pending", "approved", "rejected", "suspended"].includes(
        retrievedReview.status,
      ),
  );
  TestValidator.predicate(
    "phone_number is string or undefined",
    retrievedReview.phone_number === undefined ||
      typeof retrievedReview.phone_number === "string",
  );
  TestValidator.equals(
    "created_at is date-time format",
    typeof retrievedReview.created_at === "string",
    true,
  );
  TestValidator.predicate(
    "updated_at is date-time or undefined",
    retrievedReview.updated_at === undefined ||
      (typeof retrievedReview.updated_at === "string" &&
        new Date(retrievedReview.updated_at).toISOString() ===
          retrievedReview.updated_at),
  );
  TestValidator.equals(
    "deleted_at is null or date-time or undefined",
    retrievedReview.deleted_at === null ||
      retrievedReview.deleted_at === undefined ||
      (typeof retrievedReview.deleted_at === "string" &&
        new Date(retrievedReview.deleted_at).toISOString() ===
          retrievedReview.deleted_at),
    true,
  );
}
