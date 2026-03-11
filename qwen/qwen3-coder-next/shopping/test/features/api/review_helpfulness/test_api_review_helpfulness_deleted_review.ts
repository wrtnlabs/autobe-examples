import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_review_helpfulness_deleted_review(
  connection: api.IConnection,
): Promise<void> {
  // Create customer-specific connection for the test
  const customerConnection: api.IConnection = { host: connection.host };
  // Step 1: Call helpfulness endpoint with a sample review ID
  // This tests that the endpoint still works with deleted reviews
  const helpfulness =
    await api.functional.ecommerceMall.reviews.helpfulness.getHelpfulness(
      customerConnection,
      {
        reviewId: "00000000-0000-0000-0000-000000000001",
      },
    );
  typia.assert(helpfulness);
  // Step 2: Validate response structure
  TestValidator.predicate(
    "has helpful_count",
    typeof helpfulness.helpful_count === "number",
  );
  TestValidator.predicate(
    "has unhelpful_count",
    typeof helpfulness.unhelpful_count === "number",
  );
  TestValidator.predicate(
    "has is_helpful",
    typeof helpfulness.is_helpful === "boolean",
  );
  TestValidator.predicate(
    "helpful_count is non-negative",
    helpfulness.helpful_count >= 0,
  );
  TestValidator.predicate(
    "unhelpful_count is non-negative",
    helpfulness.unhelpful_count >= 0,
  );
}
