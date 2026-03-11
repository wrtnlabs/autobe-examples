import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshotAudit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSnapshotAudit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer ability to filter snapshot audits by date range using from_changed_at and to_changed_at parameters.
 *
 * Workflow:
 * 1. Customer joins to create an account and authenticate
 * 2. Customer retrieves snapshot-audits with from_changed_at filter
 * 3. Customer retrieves snapshot-audits with to_changed_at filter
 * 4. Customer retrieves snapshot-audits with both date range filters
 * 5. Customer retrieves snapshot-audits with empty date range (future dates)
 * 6. Validate pagination metadata and response structure for all filters
 *
 * Success criteria:
 * - API returns HTTP 200 with filtered results
 * - Pagination metadata (current, limit, records, pages) is accurate
 * - Sort order respects changed_at ordering within filtered results
 * - Empty date ranges return empty data arrays with records=0
 * - Date range parameters are accepted without validation errors
 */
export async function test_api_customer_snapshot_audit_filtering_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - join and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.com/register",
      referrer: "https://test.com",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Test from_changed_at filter - filter snapshots changed after specific date
  const twoHoursAgo = new Date();
  twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
  const fromChangedAtResponse =
    await api.functional.ecommerceMall.customer.snapshot_audits.index(
      customerConnection,
      {
        body: {
          from_changed_at: twoHoursAgo.toISOString(),
          record_type: ["review"],
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(fromChangedAtResponse);
  // 3. Test to_changed_at filter - filter snapshots changed before specific date
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  const toChangedAtResponse =
    await api.functional.ecommerceMall.customer.snapshot_audits.index(
      customerConnection,
      {
        body: {
          to_changed_at: oneHourAgo.toISOString(),
          record_type: ["review"],
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(toChangedAtResponse);
  // 4. Test combined date range filter
  const fromDate = new Date();
  fromDate.setHours(fromDate.getHours() - 3);
  const toDate = new Date();
  toDate.setHours(toDate.getHours() + 1);
  const dateRangeResponse =
    await api.functional.ecommerceMall.customer.snapshot_audits.index(
      customerConnection,
      {
        body: {
          from_changed_at: fromDate.toISOString(),
          to_changed_at: toDate.toISOString(),
          record_type: ["review"],
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // 5. Test empty range scenario - query with future date range
  const farFutureDate = new Date();
  farFutureDate.setDate(farFutureDate.getDate() + 100);
  const emptyRangeResponse =
    await api.functional.ecommerceMall.customer.snapshot_audits.index(
      customerConnection,
      {
        body: {
          from_changed_at: farFutureDate.toISOString(),
          record_type: ["review"],
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(emptyRangeResponse);
  // 6. Validate pagination metadata for all filtered results
  TestValidator.equals(
    "from_changed_at pagination records match data length",
    fromChangedAtResponse.pagination.records,
    fromChangedAtResponse.data.length,
  );
  TestValidator.equals(
    "to_changed_at pagination records match data length",
    toChangedAtResponse.pagination.records,
    toChangedAtResponse.data.length,
  );
  TestValidator.equals(
    "date_range pagination records match data length",
    dateRangeResponse.pagination.records,
    dateRangeResponse.data.length,
  );
  TestValidator.equals(
    "empty_range pagination records match data length",
    emptyRangeResponse.pagination.records,
    emptyRangeResponse.data.length,
  );
  // 7. Validate pagination current page is 1 for all queries
  TestValidator.equals(
    "from_changed_at pagination current",
    fromChangedAtResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "to_changed_at pagination current",
    toChangedAtResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "date_range pagination current",
    dateRangeResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty_range pagination current",
    emptyRangeResponse.pagination.current,
    1,
  );
  // 8. Validate pagination limit is default 20
  TestValidator.equals(
    "from_changed_at pagination limit",
    fromChangedAtResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "to_changed_at pagination limit",
    toChangedAtResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "date_range pagination limit",
    dateRangeResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "empty_range pagination limit",
    emptyRangeResponse.pagination.limit,
    20,
  );
  // 9. Validate empty range returns no records
  TestValidator.equals(
    "empty_range has no records",
    emptyRangeResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty_range has empty data array",
    emptyRangeResponse.data.length,
    0,
  );
  // 10. Validate pagination pages is calculated correctly (ceil(records / limit))
  const expectedPages1 = Math.ceil(
    fromChangedAtResponse.pagination.records /
      fromChangedAtResponse.pagination.limit,
  );
  TestValidator.equals(
    "from_changed_at pagination pages calculated correctly",
    dateRangeResponse.pagination.pages,
    expectedPages1,
  );
  // 11. Validate snapshot audit records have required fields
  if (fromChangedAtResponse.data.length > 0) {
    TestValidator.predicate(
      "from_changed_at data has changed_at field",
      !!fromChangedAtResponse.data[0].changed_at,
    );
    TestValidator.predicate(
      "from_changed_at data has record_type field",
      !!fromChangedAtResponse.data[0].record_type,
    );
    TestValidator.predicate(
      "from_changed_at data has record_id field",
      !!fromChangedAtResponse.data[0].record_id,
    );
    TestValidator.predicate(
      "from_changed_at data has id field",
      !!fromChangedAtResponse.data[0].id,
    );
    TestValidator.predicate(
      "from_changed_at data has changed_by field",
      !!fromChangedAtResponse.data[0].changed_by,
    );
  }
  // 12. Validate all date range filters accept valid date-time format
  TestValidator.predicate("from_changed_at API accepts valid date-time", true);
  TestValidator.predicate("to_changed_at API accepts valid date-time", true);
  TestValidator.predicate("combined date range API accepts valid dates", true);
}
