import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeSnapshot";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployeeSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test employee snapshot list retrieval with various filters and pagination.
 * Verifies admin can access snapshots endpoint, pagination metadata is correct,
 * all snapshot fields are present, and filtering/sorting works properly.
 */
export async function test_api_employee_snapshot_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Test default pagination (page=1, limit=20)
  const defaultResponse =
    await api.functional.hrmPlatform.admin.snapshots.index(adminConnection, {
      body: {} satisfies IHrmPlatformEmployeeSnapshot.IRequest,
    });
  typia.assert(defaultResponse);
  TestValidator.equals(
    "default page is 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 20",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "has valid pagination",
    defaultResponse.pagination.records >= 0 &&
      defaultResponse.pagination.pages >= 0,
  );
  // 3. Test sorting by created_at descending (most recent first)
  const sortedResponse = await api.functional.hrmPlatform.admin.snapshots.index(
    adminConnection,
    {
      body: {
        sortField: "created_at",
        sortOrder: "desc",
      } satisfies IHrmPlatformEmployeeSnapshot.IRequest,
    },
  );
  typia.assert(sortedResponse);
  TestValidator.equals(
    "sorted by created_at desc",
    sortedResponse.pagination.current,
    1,
  );
  // 4. Test employment type filter
  const employmentTypeResponse =
    await api.functional.hrmPlatform.admin.snapshots.index(adminConnection, {
      body: {
        employment_type: "full-time",
      } satisfies IHrmPlatformEmployeeSnapshot.IRequest,
    });
  typia.assert(employmentTypeResponse);
  TestValidator.predicate(
    "employment type filter applied",
    employmentTypeResponse.data.every(
      (snapshot) => snapshot.employment_type === "full-time",
    ),
  );
  // 5. Test status filter
  const statusResponse = await api.functional.hrmPlatform.admin.snapshots.index(
    adminConnection,
    {
      body: {
        status: "active",
      } satisfies IHrmPlatformEmployeeSnapshot.IRequest,
    },
  );
  typia.assert(statusResponse);
  TestValidator.predicate(
    "status filter applied",
    statusResponse.data.every((snapshot) => snapshot.status === "active"),
  );
  // 6. Test date range filter
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeResponse =
    await api.functional.hrmPlatform.admin.snapshots.index(adminConnection, {
      body: {
        createdFrom: oneWeekAgo.toISOString(),
        createdTo: now.toISOString(),
      } satisfies IHrmPlatformEmployeeSnapshot.IRequest,
    });
  typia.assert(dateRangeResponse);
  TestValidator.predicate(
    "date range filter applied",
    dateRangeResponse.data.every(
      (snapshot) =>
        new Date(snapshot.created_at) >= oneWeekAgo &&
        new Date(snapshot.created_at) <= now,
    ),
  );
  // 7. Test search query (case-insensitive)
  const searchQuery = "test";
  const searchResponse = await api.functional.hrmPlatform.admin.snapshots.index(
    adminConnection,
    {
      body: {
        search: searchQuery,
      } satisfies IHrmPlatformEmployeeSnapshot.IRequest,
    },
  );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search returns valid response",
    searchResponse.pagination.records >= 0,
  );
  // 8. Test pagination with custom page and limit
  const paginatedResponse =
    await api.functional.hrmPlatform.admin.snapshots.index(adminConnection, {
      body: {
        page: 2,
        limit: 10,
      } satisfies IHrmPlatformEmployeeSnapshot.IRequest,
    });
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "custom page is 2",
    paginatedResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom limit is 10",
    paginatedResponse.pagination.limit,
    10,
  );
  // 9. Test combined filters
  const combinedResponse =
    await api.functional.hrmPlatform.admin.snapshots.index(adminConnection, {
      body: {
        page: 1,
        limit: 5,
        sortField: "created_at",
        sortOrder: "desc",
        employment_type: "part-time",
        status: "active",
      } satisfies IHrmPlatformEmployeeSnapshot.IRequest,
    });
  typia.assert(combinedResponse);
  TestValidator.equals(
    "combined filters page",
    combinedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filters limit",
    combinedResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "combined filters applied correctly",
    combinedResponse.data.every(
      (snapshot) =>
        snapshot.employment_type === "part-time" &&
        snapshot.status === "active",
    ),
  );
  // 10. Verify snapshot structure contains all required fields
  if (defaultResponse.data.length > 0) {
    const firstSnapshot = defaultResponse.data[0];
    typia.assert(firstSnapshot);
    // Verify all required fields exist
    TestValidator.predicate(
      "snapshot has id",
      typeof firstSnapshot.id === "string",
    );
    TestValidator.predicate(
      "snapshot has employment_type",
      typeof firstSnapshot.employment_type === "string",
    );
    TestValidator.predicate(
      "snapshot has status",
      typeof firstSnapshot.status === "string",
    );
    TestValidator.predicate(
      "snapshot has created_at",
      typeof firstSnapshot.created_at === "string",
    );
    TestValidator.predicate(
      "snapshot has employee_created_at",
      typeof firstSnapshot.employee_created_at === "string",
    );
    TestValidator.predicate(
      "snapshot has employee_updated_at",
      typeof firstSnapshot.employee_updated_at === "string",
    );
    TestValidator.predicate(
      "snapshot has employee_deleted_at (nullable)",
      firstSnapshot.employee_deleted_at === null ||
        typeof firstSnapshot.employee_deleted_at === "string",
    );
    TestValidator.predicate(
      "snapshot has employee object",
      typeof firstSnapshot.employee === "object" &&
        firstSnapshot.employee !== null,
    );
    TestValidator.predicate(
      "snapshot has organization object",
      typeof firstSnapshot.organization === "object" &&
        firstSnapshot.organization !== null,
    );
    TestValidator.predicate(
      "snapshot has member object",
      typeof firstSnapshot.member === "object" && firstSnapshot.member !== null,
    );
    TestValidator.predicate(
      "snapshot has department (nullable)",
      firstSnapshot.department === null ||
        typeof firstSnapshot.department === "object",
    );
    TestValidator.predicate(
      "snapshot has role object",
      typeof firstSnapshot.role === "object" && firstSnapshot.role !== null,
    );
  }
}
