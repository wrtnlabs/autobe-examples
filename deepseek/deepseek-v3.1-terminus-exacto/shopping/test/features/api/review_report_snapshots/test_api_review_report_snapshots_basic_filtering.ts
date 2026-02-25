import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceReviewReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewReportSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReviewReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewReportSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_review_report_snapshots_basic_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. Prepare date range for filtering (current time to filter current data)
  const now = new Date();
  const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const endDate = now;
  // 3. Call the API with minimal filtering parameters
  const response =
    await api.functional.ecommerce.administrator.review_report_snapshots.index(
      adminConnection,
      {
        body: {
          snapshot_created_at_start: startDate.toISOString(),
          snapshot_created_at_end: endDate.toISOString(),
          // Using defaults: page=1, limit=10 (according to endpoint defaults)
        } satisfies IEcommerceReviewReportSnapshot.IRequest,
      },
    );
  // 4. Validate response structure
  typia.assert(response);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination exists",
    response.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "current page should be at least 0",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit should be at least 0",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records should be at least 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be at least 0",
    response.pagination.pages >= 0,
  );
  // 6. Validate data array matches pagination
  TestValidator.equals(
    "data array length matches page limit",
    response.data.length,
    response.pagination.limit > 0
      ? Math.min(response.pagination.limit, response.pagination.records)
      : response.pagination.records,
  );
  // 7. Validate each snapshot summary
  for (const snapshot of response.data) {
    // ID validation
    TestValidator.predicate(
      "snapshot has uuid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
    );
    // Timestamp validation
    TestValidator.predicate(
      "snapshot_created_at is valid ISO datetime",
      !isNaN(Date.parse(snapshot.snapshot_created_at)),
    );
    // Report reason and category (should be strings)
    TestValidator.equals(
      "report_reason is string",
      typeof snapshot.report_reason,
      "string",
    );
    TestValidator.equals(
      "report_category is string",
      typeof snapshot.report_category,
      "string",
    );
    // Actor validation (can be null or administrator summary)
    if (snapshot.actor !== null) {
      TestValidator.predicate(
        "actor has uuid id",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          snapshot.actor.id,
        ),
      );
      TestValidator.predicate(
        "actor has valid email",
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(snapshot.actor.email),
      );
      TestValidator.predicate(
        "actor.created_at is valid ISO datetime",
        !isNaN(Date.parse(snapshot.actor.created_at)),
      );
    }
    // Customer and review IDs validation
    TestValidator.predicate(
      "customer_id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.customer_id,
      ),
    );
    TestValidator.predicate(
      "review_id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.review_id,
      ),
    );
  }
  // 8. Validate that response matches date range filtering (basic check)
  if (response.data.length > 0) {
    const firstSnapshotDate = new Date(response.data[0].snapshot_created_at);
    TestValidator.predicate(
      "snapshot date is within range",
      firstSnapshotDate >= startDate && firstSnapshotDate <= endDate,
    );
  }
}
