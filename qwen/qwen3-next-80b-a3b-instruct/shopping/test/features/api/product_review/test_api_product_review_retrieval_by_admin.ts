import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewFlag";
import type { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";
import type { IShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReply";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_review_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = typia.random<IShoppingMallAdmin.IJoin>();
  const admin = await authorize_admin_join(adminConnection, {
    body: adminData,
  });
  typia.assert(admin);
  // Step 2: Generate a valid reviewId (sequential integer, not UUID)
  // We assume there is at least one review in the system
  const reviewId = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  // Step 3: Retrieve the review using admin connection
  const retrievedReview: IShoppingMallProductReview =
    await api.functional.shoppingMall.reviews.at(adminConnection, { reviewId });
  typia.assert(retrievedReview);
  // Step 4: Validate that admin can retrieve fields normally hidden from regular users
  // All these fields must be present for admin:
  TestValidator.predicate(
    "review has a status",
    retrievedReview.status !== undefined,
  );
  TestValidator.predicate(
    "review has customer_id",
    retrievedReview.customer_id !== undefined,
  );
  TestValidator.predicate(
    "review has flags information",
    retrievedReview.flags !== undefined,
  );
  // Validate status is one of the valid values
  TestValidator.predicate(
    "review status is valid",
    retrievedReview.status === "pending" ||
      retrievedReview.status === "approved" ||
      retrievedReview.status === "rejected",
  );
  // Validate customer_id is a valid UUID format
  TestValidator.predicate(
    "customer_id is a UUID",
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
      retrievedReview.customer_id,
    ),
  );
  // Validate flags object if present has required structure
  if (retrievedReview.flags !== undefined) {
    TestValidator.predicate(
      "flags has review_id",
      retrievedReview.flags.review_id !== undefined,
    );
    TestValidator.predicate(
      "flags has flagger_id",
      retrievedReview.flags.flagger_id !== undefined,
    );
    TestValidator.predicate(
      "flags has reason",
      retrievedReview.flags.reason !== undefined,
    );
    TestValidator.predicate(
      "flags has status",
      retrievedReview.flags.status !== undefined,
    );
    TestValidator.predicate(
      "flags reason is valid",
      retrievedReview.flags.reason === "spam" ||
        retrievedReview.flags.reason === "inappropriate_content" ||
        retrievedReview.flags.reason === "false_information" ||
        retrievedReview.flags.reason === "harassment" ||
        retrievedReview.flags.reason === "other",
    );
    TestValidator.predicate(
      "flags status is valid",
      retrievedReview.flags.status === "pending" ||
        retrievedReview.flags.status === "reviewed" ||
        retrievedReview.flags.status === "rejected" ||
        retrievedReview.flags.status === "action_taken",
    );
  }
}
