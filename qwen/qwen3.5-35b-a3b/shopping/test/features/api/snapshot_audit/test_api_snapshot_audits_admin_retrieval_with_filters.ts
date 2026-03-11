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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_snapshot_audits_admin_retrieval_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
      ip: typia.random<string & typia.tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create admin connection with token
  const adminConnectionWithToken: api.IConnection = { host: connection.host };
  adminConnectionWithToken.headers = {
    Authorization: adminAuth.token.access,
  };
  // 2. Generate test snapshot data with different entity types
  // For testing, we'll use random data since snapshots are created by other operations
  const recordTypes = [
    "product",
    "product_variant",
    "seller_profile",
    "order_item",
    "review",
    "cancellation_request",
    "refund_request",
  ] as const;
  const testRecords = ArrayUtil.repeat(20, (index) =>
    typia.random<IEcommerceMallSnapshotAudit.ISummary>(),
  );
  // 3. Test basic retrieval without filters
  const basicResponse =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnectionWithToken,
      {
        body: {},
      },
    );
  typia.assert(basicResponse);
  TestValidator.equals(
    "basic retrieval returns valid pagination",
    basicResponse.pagination.records > 0,
    true,
  );
  TestValidator.equals(
    "basic retrieval has data",
    basicResponse.data.length > 0,
    true,
  );
  // 4. Test filtering by single record_type
  const singleTypeFilter = "product";
  const filteredByTypeResponse =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnectionWithToken,
      {
        body: {
          record_type: [singleTypeFilter],
        },
      },
    );
  typia.assert(filteredByTypeResponse);
  filteredByTypeResponse.data.forEach((record) => {
    TestValidator.equals(
      `filtered record_type is ${singleTypeFilter}`,
      record.record_type,
      singleTypeFilter,
    );
  });
  // 5. Test filtering by multiple record_types
  const multipleTypes = ["product", "order_item", "review"] as const;
  const filteredByMultipleTypesResponse =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnectionWithToken,
      {
        body: {
          record_type: [...multipleTypes] as ("product" | "order_item" | "review")[],
        },
      },
    );
  typia.assert(filteredByMultipleTypesResponse);
  filteredByMultipleTypesResponse.data.forEach((record) => {
    TestValidator.predicate(
      `record_type is one of ${multipleTypes.join(", ")}`,
      multipleTypes.includes(record.record_type as "product" | "order_item" | "review"),
    );
  });
  // 6. Test date range filtering
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeFilter = {
    from_changed_at: sevenDaysAgo.toISOString(),
    to_changed_at: now.toISOString(),
  };
  const dateFilteredResponse =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnectionWithToken,
      {
        body: dateRangeFilter,
      },
    );
  typia.assert(dateFilteredResponse);
  dateFilteredResponse.data.forEach((record) => {
    const recordDate = new Date(record.changed_at);
    TestValidator.predicate(
      `changed_at is within date range (from)`,
      recordDate >= new Date(dateRangeFilter.from_changed_at!),
    );
    TestValidator.predicate(
      `changed_at is within date range (to)`,
      recordDate < new Date(dateRangeFilter.to_changed_at!),
    );
  });
  // 7. Test pagination
  const limit = 5;
  const page1Response =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnectionWithToken,
      {
        body: {
          limit,
          page: 1,
        },
      },
    );
  typia.assert(page1Response);
  TestValidator.equals(
    "page 1 limit matches request",
    page1Response.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "page 1 current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "page 1 returns at most limit records",
    page1Response.data.length <= limit,
  );
  // 8. Test pagination metadata accuracy
  const pagination = page1Response.pagination;
  TestValidator.equals(
    "pages calculated correctly",
    pagination.pages,
    Math.ceil(pagination.records / pagination.limit),
  );
  // 9. Test sorting by changed_at (default)
  const sortByChangedAtResponse =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnectionWithToken,
      {
        body: {
          sort: "changed_at",
        },
      },
    );
  typia.assert(sortByChangedAtResponse);
  // Verify records are sorted by changed_at (should be descending by default)
  for (let i = 1; i < sortByChangedAtResponse.data.length; i++) {
    const prevDate = new Date(sortByChangedAtResponse.data[i - 1].changed_at);
    const currDate = new Date(sortByChangedAtResponse.data[i].changed_at);
    TestValidator.predicate(
      "records sorted by changed_at (descending)",
      prevDate >= currDate,
    );
  }
  // 10. Test sorting by created_at
  const sortByCreatedAtResponse =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnectionWithToken,
      {
        body: {
          sort: "created_at",
        },
      },
    );
  typia.assert(sortByCreatedAtResponse);
  // 11. Test sorting by record_type
  const sortByRecordTypeResponse =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnectionWithToken,
      {
        body: {
          sort: "record_type",
        },
      },
    );
  typia.assert(sortByRecordTypeResponse);
  // 12. Test sorting by changed_by
  const sortByChangedByResponse =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnectionWithToken,
      {
        body: {
          sort: "changed_by",
        },
      },
    );
  typia.assert(sortByChangedByResponse);
  // 13. Test response structure validation
  // Verify all required fields are present
  for (const record of page1Response.data) {
    TestValidator.equals("record has id", typeof record.id, "string");
    TestValidator.equals(
      "record has record_type",
      typeof record.record_type,
      "string",
    );
    TestValidator.equals(
      "record has record_id",
      typeof record.record_id,
      "string",
    );
    TestValidator.equals(
      "record has changed_at",
      typeof record.changed_at,
      "string",
    );
    TestValidator.equals(
      "record has changed_by",
      typeof record.changed_by,
      "object",
    );
    TestValidator.equals(
      "record_id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        record.record_id,
      ),
      true,
    );
  }
  // 14. Test changed_by resolves to appropriate actor type
  for (const record of page1Response.data) {
    const changedBy = record.changed_by;
    // Should be one of: Customer, Seller, or Admin summary
    if ("display_name" in changedBy) {
      // Customer
      TestValidator.equals(
        "changed_by customer has id",
        typeof changedBy.id,
        "string",
      );
      TestValidator.equals(
        "changed_by customer has email",
        typeof changedBy.email,
        "string",
      );
    } else if ("approvalStatus" in changedBy) {
      // Seller
      TestValidator.equals(
        "changed_by seller has id",
        typeof changedBy.id,
        "string",
      );
      TestValidator.equals(
        "changed_by seller has email",
        typeof changedBy.email,
        "string",
      );
      TestValidator.equals(
        "changed_by seller has approvalStatus",
        typeof changedBy.approvalStatus,
        "string",
      );
    } else {
      // Admin
      TestValidator.equals(
        "changed_by admin has id",
        typeof changedBy.id,
        "string",
      );
      TestValidator.equals(
        "changed_by admin has email",
        typeof changedBy.email,
        "string",
      );
      TestValidator.equals(
        "changed_by admin has is_banned",
        typeof (changedBy as any).is_banned,
        "boolean",
      );
    }
  }
  // 15. Test pagination with different limit values
  const testLimits = [1, 10, 50, 100];
  for (const testLimit of testLimits) {
    const paginationResponse =
      await api.functional.ecommerceMall.admin.snapshot_audits.index(
        adminConnectionWithToken,
        {
          body: {
            limit: testLimit,
          },
        },
      );
    typia.assert(paginationResponse);
    TestValidator.equals(
      `limit ${testLimit} pagination matches`,
      paginationResponse.pagination.limit,
      testLimit,
    );
  }
  // 16. Test cursor-based pagination (using page parameter as cursor fallback)
  if (page1Response.data.length > 0) {
    const lastRecord = page1Response.data[page1Response.data.length - 1];
    const cursor = Buffer.from(
      `${lastRecord.changed_at}|${lastRecord.id}`,
    ).toString("base64");
    const cursorResponse =
      await api.functional.ecommerceMall.admin.snapshot_audits.index(
        adminConnectionWithToken,
        {
          body: {
            cursor,
          },
        },
      );
    typia.assert(cursorResponse);
  }
}