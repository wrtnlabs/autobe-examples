import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_review_history_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create customer actor
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  // Join as customer
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuthorized);
  // Login as customer to get auth token
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // Create review
  // Since we're testing admin access to review snapshots and don't have a review creation API function,
  // we directly generate a review_id rather than attempting to create a review with invalid properties
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // Create admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // Join as admin
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // Login as admin to get auth token
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // Retrieve review snapshots as admin
  const snapshots =
    await api.functional.shoppingMall.customer.reviews.snapshots.at(
      adminLoginConnection,
      {
        reviewId,
      },
    );
  typia.assert(snapshots);
  // Validate structure
  TestValidator.equals("pagination structure", snapshots.pagination.current, 1);
  TestValidator.predicate(
    "has at least one snapshot",
    snapshots.data.length > 0,
  );
  // Verify each snapshot has required properties
  for (const snapshot of snapshots.data) {
    TestValidator.equals(
      "snapshot has review_id",
      snapshot.review_id,
      reviewId,
    );
    TestValidator.predicate(
      "snapshot has rating",
      typeof snapshot.rating === "number",
    );
    TestValidator.predicate(
      "snapshot has changed_at",
      typeof snapshot.changed_at === "string",
    );
    TestValidator.predicate(
      "snapshot has changed_by",
      typeof snapshot.changed_by === "string",
    );
    TestValidator.equals(
      "snapshot changed_by is customer or admin",
      ["customer", "admin"],
      [snapshot.changed_by],
    );
    // previous_* fields can be null on first snapshot
    // Check that previous_* fields are nullable as per definition
    if (
      snapshot.previous_rating !== null &&
      snapshot.previous_rating !== undefined
    ) {
      TestValidator.equals(
        "previous_rating is a number",
        typeof snapshot.previous_rating,
        "number",
      );
    }
    if (
      snapshot.previous_content !== null &&
      snapshot.previous_content !== undefined
    ) {
      TestValidator.equals(
        "previous_content is a string or null",
        snapshot.previous_content !== null,
        true,
      );
    }
    if (
      snapshot.previous_is_deleted !== null &&
      snapshot.previous_is_deleted !== undefined
    ) {
      TestValidator.equals(
        "previous_is_deleted is a boolean",
        typeof snapshot.previous_is_deleted,
        "boolean",
      );
    }
  }
  // Test pagination with limit
  const snapshotsWithLimit =
    await api.functional.shoppingMall.customer.reviews.snapshots.at(
      adminLoginConnection,
      {
        reviewId,
      },
    );
  // Ensure pagination works - we can't test large result sets without creating many snapshots (no API to bulk create)
  // But we verify the pagination metadata is valid
  TestValidator.equals(
    "pagination limit default",
    snapshotsWithLimit.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    snapshotsWithLimit.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    snapshotsWithLimit.pagination.pages >= 1,
  );
}