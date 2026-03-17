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

export async function test_api_review_snapshot_retrieval_multiple_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
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
  // 2. Call snapshots endpoint
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
    "pagination limit positive",
    snapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    snapshots.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages matches records/limit",
    snapshots.pagination.pages ===
      Math.ceil(snapshots.pagination.records / snapshots.pagination.limit),
  );
  // 4. Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(snapshots.data));
  // 5. If snapshots exist, validate each snapshot's structure
  if (snapshots.data.length > 0) {
    await ArrayUtil.asyncForEach(snapshots.data, async (snapshot) => {
      typia.assert(snapshot);
      // Validate snapshot id is UUID
      TestValidator.predicate(
        "snapshot id is uuid",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          snapshot.id,
        ),
      );
      // Validate review summary exists
      typia.assert(snapshot.review);
      TestValidator.predicate(
        "review id is uuid",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          snapshot.review.id,
        ),
      );
      TestValidator.predicate(
        "review rating in range",
        snapshot.review.rating >= 1 && snapshot.review.rating <= 5,
      );
      // Validate changedByCustomer exists
      typia.assert(snapshot.changedByCustomer);
      TestValidator.equals(
        "changedByCustomer id matches customer",
        snapshot.changedByCustomer.id,
        customerAuth.id,
      );
      TestValidator.predicate(
        "customer email is email",
        /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
          snapshot.changedByCustomer.email,
        ),
      );
      // Validate createdAt is ISO datetime
      TestValidator.predicate(
        "createdAt is datetime",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/i.test(
          snapshot.createdAt,
        ),
      );
      // Validate previousValues and currentValues are objects
      TestValidator.predicate(
        "previousValues is object",
        typeof snapshot.previousValues === "object" &&
          snapshot.previousValues !== null,
      );
      TestValidator.predicate(
        "currentValues is object",
        typeof snapshot.currentValues === "object" &&
          snapshot.currentValues !== null,
      );
    });
  }
}
