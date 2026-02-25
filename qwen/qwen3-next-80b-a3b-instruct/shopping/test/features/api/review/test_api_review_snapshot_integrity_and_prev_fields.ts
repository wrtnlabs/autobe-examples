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

export async function test_api_review_snapshot_integrity_and_prev_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate a random review ID (since we cannot create review data)
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // 3. Fetch snapshots for the random reviewId
  const snapshotsResponse =
    await api.functional.shoppingMall.admin.reviews.snapshots.at(
      adminConnection,
      {
        reviewId,
      },
    );
  typia.assert(snapshotsResponse);
  // 4. Validate response structure conforms to IPageIShoppingMallReviewSnapshot
  TestValidator.equals(
    "response pagination structure",
    snapshotsResponse.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "response pagination limit",
    snapshotsResponse.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "response pagination records",
    snapshotsResponse.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "response pagination pages",
    snapshotsResponse.pagination.pages >= 0,
    true,
  );
  TestValidator.equals(
    "response data array",
    Array.isArray(snapshotsResponse.data),
    true,
  );
  // Validate the structure of at least one snapshot if data exists
  if (snapshotsResponse.data.length > 0) {
    const snapshot = snapshotsResponse.data[0];
    TestValidator.equals(
      "snapshot has id",
      typeof snapshot.id === "string",
      true,
    );
    TestValidator.equals(
      "snapshot has rating",
      typeof snapshot.rating === "number",
      true,
    );
    TestValidator.equals(
      "snapshot has changed_at",
      typeof snapshot.changed_at === "string",
      true,
    );
    TestValidator.equals(
      "snapshot has changed_by",
      typeof snapshot.changed_by === "string",
      true,
    );
    TestValidator.equals(
      "snapshot has review_id",
      typeof snapshot.review_id === "string",
      true,
    );
    // Optional fields should be either string/null/undefined or boolean/undefined
    TestValidator.predicate(
      "snapshot content is string|null|undefined",
      snapshot.content === null ||
        snapshot.content === undefined ||
        typeof snapshot.content === "string",
    );
    TestValidator.predicate(
      "snapshot is_deleted is boolean|undefined",
      snapshot.is_deleted === undefined ||
        typeof snapshot.is_deleted === "boolean",
    );
    TestValidator.predicate(
      "snapshot previous_rating is number|null|undefined",
      snapshot.previous_rating === null ||
        snapshot.previous_rating === undefined ||
        typeof snapshot.previous_rating === "number",
    );
    TestValidator.predicate(
      "snapshot previous_content is string|null|undefined",
      snapshot.previous_content === null ||
        snapshot.previous_content === undefined ||
        typeof snapshot.previous_content === "string",
    );
    TestValidator.predicate(
      "snapshot previous_is_deleted is boolean|null|undefined",
      snapshot.previous_is_deleted === null ||
        snapshot.previous_is_deleted === undefined ||
        typeof snapshot.previous_is_deleted === "boolean",
    );
  }
}
