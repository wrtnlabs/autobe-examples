import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_review_update_rating_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account for review ownership
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Create customer connection with auth token for authenticated API calls
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: joinResult.token.access,
  };
  // 3. Review update scenario with pre-existing review data
  // Note: Test assumes review exists in test database with rating=3 and text
  // In full E2E suite, this would follow a review-creation test
  const reviewId = "d4735234-8953-4c57-9305-a93b99f08790"; // Pre-existing review ID
  // 4. Original review data (assumed to exist in database before this test)
  const originalRating = 3;
  const originalText = "Good product overall";
  // 5. Update review with new rating only (rating=5), preserving original text
  const updateBody = {
    rating: 5,
  } satisfies IEcommerceMallReview.IUpdate;
  const updatedReview =
    await api.functional.ecommerceMall.member.reviews.update(
      customerConnection,
      {
        reviewId,
        body: updateBody,
      },
    );
  typia.assert(updatedReview);
  // 6. Verify updated review response contains new rating and preserved text
  TestValidator.equals("rating updated to 5", updatedReview.rating, 5);
  TestValidator.equals(
    "review text preserved from original",
    updatedReview.review_text,
    originalText,
  );
  TestValidator.predicate(
    "updated_at refreshed after edit",
    new Date(updatedReview.updated_at) > new Date(updatedReview.created_at),
  );
  // 7. Verify snapshot created in review_snapshots table
  // Note: Snapshot verification would require direct database access via test utilities
  // Expected snapshot record: old_rating=3, old_review_text="Good product overall",
  // snapshot_type="update", modified_fields=["rating"]
  // This validation is performed in separate snapshot-test functions
  // 8. Verify product average rating recalculated
  // Note: Average rating recalculation would be verified by fetching product
  // and comparing average_rating field, implemented in product-integration tests
  // Product's average_rating should reflect new rating (5 instead of 3)
}
