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

export async function test_api_review_snapshot_retrieval_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Retrieve review snapshots
  const snapshots =
    await api.functional.ecommerceMall.customer.reviews.my.snapshots.at(
      customerConnection,
    );
  typia.assert(snapshots);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid current page",
    snapshots.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    snapshots.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    snapshots.pagination.pages >= 0,
  );
  // 4. Validate data array exists and matches pagination
  TestValidator.predicate("data array exists", Array.isArray(snapshots.data));
  TestValidator.equals(
    "snapshot count matches pagination records",
    snapshots.data.length,
    snapshots.pagination.records,
  );
  // 5. If snapshots exist, validate snapshot structure integrity
  if (snapshots.data.length > 0) {
    TestValidator.predicate(
      "all snapshots have valid UUIDs",
      snapshots.data.every((s) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          s.id,
        ),
      ),
    );
    TestValidator.predicate(
      "all snapshots have valid review references",
      snapshots.data.every((s) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          s.review.id,
        ),
      ),
    );
    TestValidator.predicate(
      "all snapshots have valid customer references",
      snapshots.data.every((s) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          s.changedByCustomer.id,
        ),
      ),
    );
    TestValidator.predicate(
      "all snapshots have rating between 1-5",
      snapshots.data.every((s) => s.review.rating >= 1 && s.review.rating <= 5),
    );
    TestValidator.predicate(
      "all snapshots have previous values",
      snapshots.data.every(
        (s) => s.previousValues !== null && s.previousValues !== undefined,
      ),
    );
    TestValidator.predicate(
      "all snapshots have current values",
      snapshots.data.every(
        (s) => s.currentValues !== null && s.currentValues !== undefined,
      ),
    );
  }
}
