import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewReply";
import type { IShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReply";
export async function test_api_product_review_replies_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID to use as a review ID
  // This review ID should not exist in the system
  const nonExistentReviewId = typia.random<string & tags.Format<"uuid">>();
  // Call the only available endpoint with a non-existent review ID
  const response = await api.functional.shoppingMall.reviews.replies.index(
    connection,
    {
      reviewId: nonExistentReviewId,
    },
  );
  typia.assert(response);
  // Validate the response structure according to IPageIShoppingMallReviewReply
  // Even with non-existent review, the service should return valid pagination structure and empty data
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.equals("pagination records", response.pagination.records, 0);
  TestValidator.equals("pagination pages", response.pagination.pages, 0);
  TestValidator.equals("data array length", response.data.length, 0);
  // Test with a valid review ID that might exist in the test environment
  // Since we cannot create test data, we'll use a different approach
  // This tests that the endpoint accepts a UUID format and returns valid structure
  const validUuid = typia.random<string & tags.Format<"uuid">>();
  const response2 = await api.functional.shoppingMall.reviews.replies.index(
    connection,
    {
      reviewId: validUuid,
    },
  );
  typia.assert(response2);
  // Validate pagination and data structure
  TestValidator.predicate(
    "pagination is valid",
    () =>
      response2.pagination.current >= 0 &&
      response2.pagination.limit > 0 &&
      response2.pagination.records >= 0 &&
      response2.pagination.pages >= 0,
  );
  TestValidator.predicate("data is array", () => Array.isArray(response2.data));
  // Test that the response data elements have the correct structure
  if (response2.data.length > 0) {
    // If replies exist in the test environment, validate their structure
    const firstReply = response2.data[0];
    TestValidator.equals("reply has id", typeof firstReply.id, "string");
    TestValidator.predicate("reply id is uuid", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstReply.id,
      ),
    );
    TestValidator.equals(
      "reply has reply_content",
      typeof firstReply.reply_content,
      "string",
    );
    TestValidator.predicate(
      "reply_content is not empty and not too long",
      () =>
        firstReply.reply_content.length >= 1 &&
        firstReply.reply_content.length <= 1000,
    );
    TestValidator.equals(
      "reply has created_at",
      typeof firstReply.created_at,
      "string",
    );
    TestValidator.predicate("created_at is ISO 8601 datetime", () =>
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(firstReply.created_at),
    );
    TestValidator.equals(
      "reply has author_id",
      typeof firstReply.author_id,
      "string",
    );
    TestValidator.predicate("author_id is uuid", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstReply.author_id,
      ),
    );
  }
}
