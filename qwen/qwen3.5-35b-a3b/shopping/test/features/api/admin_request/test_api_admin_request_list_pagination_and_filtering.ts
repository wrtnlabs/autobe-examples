import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequestRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_request_list_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Get page 1 with limit=10
  const page1 =
    await api.functional.ecommerceMall.admin.admin_request_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(page1);
  // 3. Verify pagination metadata for page 1
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.equals(
    "page 1 records",
    page1.pagination.records,
    page1.data.length,
  );
  TestValidator.equals(
    "page 1 pages",
    page1.pagination.pages,
    Math.ceil(page1.data.length / 10),
  );
  // 4. Get page 2 with limit=10
  const page2 =
    await api.functional.ecommerceMall.admin.admin_request_requests.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(page2);
  // 5. Verify page 2 pagination metadata
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  TestValidator.equals(
    "page 2 records",
    page2.pagination.records,
    page1.pagination.records,
  );
  // 6. Verify page 1 and page 2 data are different (page IDs)
  if (page1.data.length > 0 && page2.data.length > 0) {
    const page1Ids = page1.data.map((item) => item.id);
    const page2Ids = page2.data.map((item) => item.id);
    TestValidator.notEquals(
      "page 1 and page 2 IDs differ",
      page1Ids[0],
      page2Ids[0],
    );
  }
  // 7. Test date range filter
  const thirtyDaysAgo = new Date().getTime() - 30 * 24 * 60 * 60 * 1000;
  const startDate = new Date(thirtyDaysAgo).toISOString();
  const endDate = new Date().toISOString();
  const filtered =
    await api.functional.ecommerceMall.admin.admin_request_requests.index(
      adminConnection,
      {
        body: {
          created_at_start: startDate,
          created_at_end: endDate,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(filtered);
  // Verify filtered results have valid date range
  for (const item of filtered.data) {
    if (item.created_at !== undefined) {
      TestValidator.predicate(
        `${item.id} created_at is valid date`,
        !isNaN(new Date(item.created_at).getTime()),
      );
    }
  }
  // 8. Test invalid date range (end date before start date)
  await TestValidator.error("invalid date range rejected", async () => {
    await api.functional.ecommerceMall.admin.admin_request_requests.index(
      adminConnection,
      {
        body: {
          created_at_start: endDate,
          created_at_end: startDate,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  });
  // 9. Test invalid page number (page 0)
  await TestValidator.error("page 0 rejected", async () => {
    await api.functional.ecommerceMall.admin.admin_request_requests.index(
      adminConnection,
      {
        body: {
          page: 0,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  });
  // Test invalid page number (negative page)
  await TestValidator.error("negative page rejected", async () => {
    await api.functional.ecommerceMall.admin.admin_request_requests.index(
      adminConnection,
      {
        body: {
          page: -1,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  });
  // 10. Test invalid limit (limit 0)
  await TestValidator.error("limit 0 rejected", async () => {
    await api.functional.ecommerceMall.admin.admin_request_requests.index(
      adminConnection,
      {
        body: {
          limit: 0,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  });
  // Test invalid limit (limit 101)
  await TestValidator.error("limit 101 rejected", async () => {
    await api.functional.ecommerceMall.admin.admin_request_requests.index(
      adminConnection,
      {
        body: {
          limit: 101,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  });
  // 11. Test sorting by updated_at
  const sortedByUpdated =
    await api.functional.ecommerceMall.admin.admin_request_requests.index(
      adminConnection,
      {
        body: {
          sort_by: "updated_at",
          sort_order: "desc",
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(sortedByUpdated);
  // 12. Test sorting by request_status
  const sortedByStatus =
    await api.functional.ecommerceMall.admin.admin_request_requests.index(
      adminConnection,
      {
        body: {
          sort_by: "request_status",
          sort_order: "asc",
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(sortedByStatus);
  // Verify request_status values are valid
  for (const item of sortedByStatus.data) {
    TestValidator.predicate(
      `${item.id} request_status is valid`,
      ["pending", "approved", "rejected"].includes(item.request_status),
    );
  }
  // 13. Test status filter
  const filteredByStatus =
    await api.functional.ecommerceMall.admin.admin_request_requests.index(
      adminConnection,
      {
        body: {
          request_status: "pending",
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(filteredByStatus);
  // Verify all returned items have the filtered status
  for (const item of filteredByStatus.data) {
    TestValidator.equals(
      `${item.id} status matches filter`,
      item.request_status,
      "pending",
    );
  }
}
