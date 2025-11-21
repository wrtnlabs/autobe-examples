import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewReaction";
import type { IShoppingMallReviewReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReaction";

export async function test_api_review_reaction_by_anonymous_rejected(
  connection: api.IConnection,
) {
  // Generate a random UUID for a valid review ID
  const reviewId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to submit a reaction without authentication (anonymous user)
  // This should fail with a 401 Unauthorized error
  await TestValidator.error(
    "unauthenticated user should be rejected from submitting review reactions",
    async () => {
      await api.functional.shoppingMall.reviews.reactions.index(connection, {
        reviewId: reviewId,
      });
    },
  );
}
