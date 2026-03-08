import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_review_snapshots_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string &
          tags.MinLength<1> &
          tags.MaxLength<255> &
          tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Request with default pagination
  const snapshots: IPageIEcommerceMallReviewSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 3. Validate pagination metadata
  TestValidator.equals("current page", snapshots.pagination.current, 1);
  TestValidator.equals("limit", snapshots.pagination.limit, 20);
  TestValidator.predicate(
    "total records non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages non-negative",
    snapshots.pagination.pages >= 0,
  );
  // 4. Validate snapshot data structure exists
  if (snapshots.data.length > 0) {
    const snapshot = snapshots.data[0];
    typia.assert(snapshot);
    // Business logic validation: snapshot has required references
    TestValidator.predicate(
      "snapshot has review reference",
      snapshot.review !== null && snapshot.review !== undefined,
    );
    TestValidator.predicate(
      "snapshot has changedByCustomer reference",
      snapshot.changedByCustomer !== null &&
        snapshot.changedByCustomer !== undefined,
    );
    TestValidator.predicate(
      "snapshot has previousValues",
      snapshot.previousValues !== null && snapshot.previousValues !== undefined,
    );
    TestValidator.predicate(
      "snapshot has currentValues",
      snapshot.currentValues !== null && snapshot.currentValues !== undefined,
    );
  }
  // 5. Test pagination with custom parameters
  const customPageSnapshots: IPageIEcommerceMallReviewSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(customPageSnapshots);
  TestValidator.equals(
    "custom page",
    customPageSnapshots.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom limit",
    customPageSnapshots.pagination.limit,
    10,
  );
}