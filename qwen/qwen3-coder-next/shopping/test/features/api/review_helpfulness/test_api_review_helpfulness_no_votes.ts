import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_review_helpfulness_no_votes(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random review ID since we don't have review creation endpoint
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // Get helpfulness with no votes
  const helpfulness =
    await api.functional.ecommerceMall.reviews.helpfulness.getHelpfulness(
      connection,
      {
        reviewId: reviewId,
      },
    );
  typia.assert(helpfulness);
  // Validate no votes - helpful_count and unhelpful_count should be 0
  TestValidator.equals("helpful_count is 0", helpfulness.helpful_count, 0);
  TestValidator.equals("unhelpful_count is 0", helpfulness.unhelpful_count, 0);
  // is_helpful is false by default for non-voters
  TestValidator.equals(
    "is_helpful is false by default",
    helpfulness.is_helpful,
    false,
  );
}
