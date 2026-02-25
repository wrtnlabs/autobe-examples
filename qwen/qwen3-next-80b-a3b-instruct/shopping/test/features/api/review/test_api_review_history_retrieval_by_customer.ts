import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_review_history_retrieval_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account to own the review
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Use a known review_id from test fixture that belongs to this customer
  const reviewId = "b1b51f07-3089-4ede-9aa5-0d4d720fa510"; // Test fixture review
  // 3. Retrieve review snapshots
  const snapshots =
    await api.functional.shoppingMall.customer.reviews.snapshots.at(
      customerConnection,
      { reviewId },
    );
  typia.assert(snapshots);
  // 4. Validate pagination metadata
  TestValidator.equals("pagination current", snapshots.pagination.current, 1);
  TestValidator.equals("pagination limit", snapshots.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records > 0",
    snapshots.pagination.records > 0,
  );
  TestValidator.equals(
    "pagination pages",
    snapshots.pagination.pages,
    Math.ceil(snapshots.pagination.records / snapshots.pagination.limit),
  );
  // 5. Validate data list is not empty
  TestValidator.predicate("data length > 0", snapshots.data.length > 0);
  // 6. Validate each snapshot has correct structure and belongs to customer
  snapshots.data.forEach((snapshot) => {
    TestValidator.equals(
      "snapshot review_id matches",
      snapshot.review_id,
      reviewId,
    );
    TestValidator.equals(
      "snapshot changed_by matches customer",
      snapshot.changed_by,
      customer.id,
    );
    TestValidator.predicate(
      "snapshot rating is int32",
      Number.isInteger(snapshot.rating),
    );
    TestValidator.predicate(
      "snapshot rating between 1-5",
      snapshot.rating >= 1 && snapshot.rating <= 5,
    );
    TestValidator.equals(
      "snapshot changed_at is ISO date",
      typeof snapshot.changed_at,
      "string",
    );
    TestValidator.predicate(
      "snapshot changed_at valid timestamp",
      !isNaN(Date.parse(snapshot.changed_at)),
    );
  });
  // 7. Test error case: non-existent reviewId (expect 404)
  await TestValidator.httpError(
    "should return 404 for non-existent review",
    404,
    async () => {
      await api.functional.shoppingMall.customer.reviews.snapshots.at(
        customerConnection,
        { reviewId: "00000000-0000-0000-0000-000000000000" },
      );
    },
  );
  // 8. Test data consistency: if snapshot has previous fields, they must be consistent
  for (let i = 0; i < snapshots.data.length; i++) {
    const current = snapshots.data[i];
    const previous = snapshots.data[i - 1];
    if (previous) {
      if (current.previous_rating !== null) {
        TestValidator.equals(
          "current rating matches previous after change",
          current.previous_rating,
          previous.rating,
        );
      }
      if (current.previous_content !== null) {
        TestValidator.equals(
          "current content matches previous after edit",
          current.previous_content,
          previous.content,
        );
      }
      if (current.previous_is_deleted !== null) {
        TestValidator.equals(
          "current is_deleted matches previous change",
          current.previous_is_deleted,
          previous.is_deleted,
        );
      }
    }
  }
}
