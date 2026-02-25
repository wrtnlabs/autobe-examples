import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_reviews_snapshot_access_all(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  // Use the authenticated connection directly (headers are already set by authorize_admin_join)
  // Request all review snapshots with default pagination
  const response: IPageIShoppingMallReviewSnapshot.ISummary =
    await api.functional.shoppingMall.admin.reviews_snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  // Validate response structure with typia.assert
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals("page number is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 10", response.pagination.limit, 10);
  TestValidator.predicate(
    "has at least one record",
    response.pagination.records > 0,
  );
  TestValidator.predicate(
    "pages are calculated correctly",
    response.pagination.pages >= 1,
  );
  // Validate each snapshot item using typia.assertGuard for type narrowing
  for (const snapshot of response.data) {
    // Basic snapshot fields - typia.assertGuard narrows types automatically
    typia.assertGuard(snapshot);
    // Rating must be between 1-5
    TestValidator.predicate(
      "rating is between 1 and 5",
      snapshot.rating >= 1 && snapshot.rating <= 5,
    );
    // changed_at is ISO date-time
    TestValidator.predicate(
      "changed_at is ISO date-time",
      !isNaN(new Date(snapshot.changed_at).getTime()),
    );
    // changed_by must be "customer" or "admin"
    TestValidator.predicate(
      "changed_by is either 'customer' or 'admin'",
      snapshot.changed_by === "customer" || snapshot.changed_by === "admin",
    );
    // content is optional string or null
    if (snapshot.content !== undefined && snapshot.content !== null) {
      TestValidator.predicate(
        "content is string if present",
        typeof snapshot.content === "string",
      );
    }
    // previous_rating is optional nullable number
    if (
      snapshot.previous_rating !== undefined &&
      snapshot.previous_rating !== null
    ) {
      TestValidator.predicate(
        "previous_rating is between 1 and 5 if present",
        snapshot.previous_rating >= 1 && snapshot.previous_rating <= 5,
      );
    }
    // previous_content is optional nullable string
    if (
      snapshot.previous_content !== undefined &&
      snapshot.previous_content !== null
    ) {
      TestValidator.predicate(
        "previous_content is string if present",
        typeof snapshot.previous_content === "string",
      );
    }
    // previous_is_deleted is optional nullable boolean
    if (
      snapshot.previous_is_deleted !== undefined &&
      snapshot.previous_is_deleted !== null
    ) {
      TestValidator.predicate(
        "previous_is_deleted is boolean if present",
        typeof snapshot.previous_is_deleted === "boolean",
      );
    }
    // is_deleted is boolean
    TestValidator.predicate(
      "is_deleted is boolean",
      typeof snapshot.is_deleted === "boolean",
    );
  }
}
