import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshotAudit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSnapshotAudit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test pagination and performance for large audit datasets to ensure administrators can efficiently navigate extensive audit trails.
 */
export async function test_api_snapshot_audits_pagination_large_dataset(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host, headers: {} };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Update connection with admin token for subsequent API calls
  adminConnection.headers = { ...adminConnection.headers, Authorization: admin.token.access };
  // 2. Test default pagination (limit should be 50)
  const defaultResponse =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(defaultResponse);
  // Verify default pagination metadata
  TestValidator.equals(
    "default pagination - current page",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination - limit is 50",
    defaultResponse.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "default pagination - has records",
    () => defaultResponse.data.length > 0,
  );
  TestValidator.equals(
    "default pagination - records count matches limit",
    defaultResponse.data.length,
    defaultResponse.pagination.limit,
  );
  // 3. Test custom limits
  // Query with limit=100
  const limit100Response =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: { limit: 100 },
      },
    );
  typia.assert(limit100Response);
  TestValidator.equals(
    "limit=100 pagination - limit",
    limit100Response.pagination.limit,
    100,
  );
  TestValidator.equals(
    "limit=100 - records count matches limit",
    limit100Response.data.length,
    100,
  );
  // Query with limit=200 (maximum)
  const limit200Response =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: { limit: 200 },
      },
    );
  typia.assert(limit200Response);
  TestValidator.equals(
    "limit=200 pagination - limit",
    limit200Response.pagination.limit,
    200,
  );
  TestValidator.equals(
    "limit=200 - records count matches limit",
    limit200Response.data.length,
    200,
  );
  // Query with limit=10
  const limit10Response =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: { limit: 10 },
      },
    );
  typia.assert(limit10Response);
  TestValidator.equals(
    "limit=10 pagination - limit",
    limit10Response.pagination.limit,
    10,
  );
  TestValidator.equals(
    "limit=10 - records count matches limit",
    limit10Response.data.length,
    10,
  );
  // 4. Test page navigation
  // Query page=1
  const page1Response =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: { page: 1, limit: 50 },
      },
    );
  typia.assert(page1Response);
  TestValidator.equals(
    "page=1 pagination - current",
    page1Response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "page=1 - has records",
    () => page1Response.data.length > 0,
  );
  // Query page=2
  const page2Response =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: { page: 2, limit: 50 },
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page=2 pagination - current",
    page2Response.pagination.current,
    2,
  );
  TestValidator.notEquals(
    "page=2 pagination - records differ from page=1",
    page1Response.data[0]?.id,
    page2Response.data[0]?.id,
  );
  // Verify page 2 records don't overlap with page 1
  for (const page2Record of page2Response.data) {
    TestValidator.predicate(
      `page=2 record ${page2Record.id} should not be in page=1`,
      () => !page1Response.data.some((p) => p.id === page2Record.id),
    );
  }
  // Query page beyond available pages (should return empty results)
  const page1000Response =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: { page: 1000, limit: 50 },
      },
    );
  typia.assert(page1000Response);
  TestValidator.equals(
    "page=1000 pagination - current",
    page1000Response.pagination.current,
    1000,
  );
  TestValidator.equals(
    "page=1000 pagination - data is empty",
    page1000Response.data.length,
    0,
  );
  // 5. Verify sorting is applied consistently
  const sortedResponseAsc =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: { sortBy: "changed_at", sortOrder: "asc", limit: 10 },
      },
    );
  typia.assert(sortedResponseAsc);
  const sortedResponseDesc =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: { sortBy: "changed_at", sortOrder: "desc", limit: 10 },
      },
    );
  typia.assert(sortedResponseDesc);
  // Verify ascending order
  for (let i = 1; i < sortedResponseAsc.data.length; i++) {
    TestValidator.predicate(
      `sorting asc - ${i}th record should be >= ${i - 1}th record`,
      () =>
        sortedResponseAsc.data[i].changed_at >=
        sortedResponseAsc.data[i - 1].changed_at,
    );
  }
  // Verify descending order
  for (let i = 1; i < sortedResponseDesc.data.length; i++) {
    TestValidator.predicate(
      `sorting desc - ${i}th record should be <= ${i - 1}th record`,
      () =>
        sortedResponseDesc.data[i].changed_at <=
        sortedResponseDesc.data[i - 1].changed_at,
    );
  }
  // 6. Verify pagination metadata accuracy
  const metadataResponse =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: { limit: 50 },
      },
    );
  typia.assert(metadataResponse);
  const expectedPages = Math.ceil(
    metadataResponse.pagination.records / metadataResponse.pagination.limit,
  );
  TestValidator.equals(
    "pagination metadata - pages calculation",
    metadataResponse.pagination.pages,
    expectedPages,
  );
  // Verify total records is consistent across requests
  const metadataResponse2 =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: { limit: 50 },
      },
    );
  typia.assert(metadataResponse2);
  TestValidator.equals(
    "pagination metadata - records consistency",
    metadataResponse.pagination.records,
    metadataResponse2.pagination.records,
  );
  // 7. Test filter criteria pagination
  // Query with filter on page=2
  const filteredResponse1 =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: { recordType: "product", page: 2, limit: 50 },
      },
    );
  typia.assert(filteredResponse1);
  TestValidator.equals(
    "filter page=2 pagination - current",
    filteredResponse1.pagination.current,
    2,
  );
  TestValidator.predicate(
    "filter page=2 - has records",
    () => filteredResponse1.data.length > 0,
  );
  // Change filter and verify it returns page=1 by default
  const filteredResponse2 =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: { recordType: "product_variant", page: 2, limit: 50 },
      },
    );
  typia.assert(filteredResponse2);
  TestValidator.equals(
    "different filter page=2 pagination - current",
    filteredResponse2.pagination.current,
    2,
  );
  // Verify filtered responses respect the filter
  for (const record of filteredResponse1.data) {
    TestValidator.predicate(
      `filtered record ${record.id} should have record_type=product`,
      () => record.record_type === "product",
    );
  }
  // 8. Verify response time performance (SLO check)
  const startTime = Date.now();
  const performanceResponse =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: { limit: 200 },
      },
    );
  typia.assert(performanceResponse);
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  TestValidator.predicate(
    "performance - response time within SLO (5 seconds)",
    () => responseTime <= 5000,
  );
  console.log(`Response time: ${responseTime}ms`);
  // Verify the response contains valid data
  TestValidator.predicate(
    "performance response - has valid data",
    () =>
      performanceResponse.data.length > 0 ||
      performanceResponse.pagination.records > 0,
  );
}