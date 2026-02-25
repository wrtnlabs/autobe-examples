import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_review_snapshot_retrieval_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Retrieve an existing product review snapshot by a valid productReviewSnapshotId.
  // Setup a known valid productReviewSnapshotId by generating a random valid type.
  const validProductReviewSnapshotId = typia.random<
    string & tags.Format<"uuid">
  >();
  // Use actor-specific connection (although authorizationActor is null, we simulate).
  const actorConnection: api.IConnection = { host: connection.host };
  // Call the API method to retrieve the product review snapshot.
  const snapshot = await api.functional.shoppingMall.productReviewSnapshots.at(
    actorConnection,
    {
      productReviewSnapshotId: validProductReviewSnapshotId,
    },
  );
  // Assert the response type and structure.
  typia.assert(snapshot);
  // Check required fields presence and types (some checks redundant due to typia.assert but explicit domain checks).
  // id
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      snapshot.id,
    ),
  );
  // rating between 1 and 5
  TestValidator.predicate(
    "rating between 1 and 5",
    snapshot.rating >= 1 && snapshot.rating <= 5,
  );
  // Verify timestamps (ISO 8601 date-time format)
  const iso8601Regex =
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.\d+)?(Z|[+-][01][0-9]:[0-5][0-9])$/;
  TestValidator.predicate(
    "createdAt is ISO 8601 format",
    iso8601Regex.test(snapshot.createdAt),
  );
  TestValidator.predicate(
    "updatedAt is ISO 8601 format",
    iso8601Regex.test(snapshot.updatedAt),
  );
  if (snapshot.deletedAt !== null) {
    TestValidator.predicate(
      "deletedAt is ISO 8601 format or null",
      iso8601Regex.test(snapshot.deletedAt),
    );
  }
  // Check sub summaries detailed structure with typia.assert
  typia.assert(snapshot.productReview);
  typia.assert(snapshot.orderItem);
  typia.assert(snapshot.productVariant);
  // Scenario 2: Attempt to retrieve a product review snapshot by a non-existent or invalid productReviewSnapshotId.
  // Generate a random UUID but this one does not exist (simulate non-existence)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Expect an error to be thrown with 404 status.
  await TestValidator.error(
    "non-existent product review snapshot should return 404",
    async () => {
      await api.functional.shoppingMall.productReviewSnapshots.at(
        actorConnection,
        {
          productReviewSnapshotId: nonExistentId,
        },
      );
    },
  );
}
