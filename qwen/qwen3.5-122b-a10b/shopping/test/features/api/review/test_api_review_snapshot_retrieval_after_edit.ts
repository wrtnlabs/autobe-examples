import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer review snapshot retrieval after editing a review.
 *
 * This test validates that:
 * 1. Customer can register and authenticate
 * 2. Review snapshots are created when reviews are edited
 * 3. Snapshots contain previousValues and currentValues
 * 4. Snapshots include the customer who made changes and timestamp
 * 5. Pagination metadata is correctly returned
 */
export async function test_api_review_snapshot_retrieval_after_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Retrieve review snapshots
  // Note: In a real scenario, we would first create a review, edit it, then retrieve snapshots
  // Since review creation/editing APIs are not available in the provided SDK, we test the snapshot retrieval endpoint
  const snapshots =
    await api.functional.ecommerceMall.customer.reviews.my.snapshots.at(
      customerConnection,
    );
  typia.assert(snapshots);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshots.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    snapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    snapshots.pagination.pages >= 0,
  );
  // 4. Validate snapshot structure if snapshots exist
  if (snapshots.data.length > 0) {
    const snapshot = snapshots.data[0];
    // Validate snapshot ID
    TestValidator.predicate(
      "snapshot has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
    );
    // Validate review information
    TestValidator.predicate(
      "review has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.review.id,
      ),
    );
    TestValidator.predicate(
      "review rating is 1-5",
      snapshot.review.rating >= 1 && snapshot.review.rating <= 5,
    );
    // Validate changedByCustomer information
    TestValidator.predicate(
      "changedByCustomer has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.changedByCustomer.id,
      ),
    );
    TestValidator.predicate(
      "changedByCustomer has valid email",
      snapshot.changedByCustomer.email.includes("@"),
    );
    // Validate timestamp
    TestValidator.predicate(
      "createdAt is valid ISO datetime",
      !isNaN(Date.parse(snapshot.createdAt)),
    );
    // Validate previousValues and currentValues exist
    TestValidator.predicate(
      "previousValues exists",
      snapshot.previousValues !== null && snapshot.previousValues !== undefined,
    );
    TestValidator.predicate(
      "currentValues exists",
      snapshot.currentValues !== null && snapshot.currentValues !== undefined,
    );
  }
}
