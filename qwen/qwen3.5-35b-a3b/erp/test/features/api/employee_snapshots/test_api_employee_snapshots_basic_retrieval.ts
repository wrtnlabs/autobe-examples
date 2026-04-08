import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployeesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeesSnapshot";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployeesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployeesSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_snapshots_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member to establish authentication context
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Use deterministic employee UUID (in practice, this would be created via employee management API)
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve snapshots with default pagination
  const snapshotsResponse =
    await api.functional.hrmPlatform.member.employees.snapshots.index(
      memberConnection,
      {
        employeeId,
        body: {
          limit: 20,
          page: 1,
        } satisfies IHrmPlatformEmployeesSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 4. Validate response structure
  TestValidator.equals(
    "response has pagination metadata",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "response has correct limit",
    snapshotsResponse.pagination.limit,
    20,
  );
  // 5. Validate snapshot data structure if any records exist
  if (snapshotsResponse.data.length > 0) {
    typia.assert(snapshotsResponse.data);
    const firstSnapshot = snapshotsResponse.data[0];
    typia.assert(firstSnapshot);
    // Validate snapshot contains required fields per ISummary
    TestValidator.notEquals(
      "snapshot has id field",
      firstSnapshot.id,
      undefined,
    );
    TestValidator.notEquals(
      "snapshot has position field",
      firstSnapshot.position,
      undefined,
    );
    TestValidator.notEquals(
      "snapshot has employment_type field",
      firstSnapshot.employment_type,
      undefined,
    );
    TestValidator.notEquals(
      "snapshot has status field",
      firstSnapshot.status,
      undefined,
    );
    TestValidator.notEquals(
      "snapshot has created_at field",
      firstSnapshot.created_at,
      undefined,
    );
    TestValidator.notEquals(
      "snapshot has user reference",
      firstSnapshot.user,
      undefined,
    );
    TestValidator.notEquals(
      "snapshot has organization reference",
      firstSnapshot.organization,
      undefined,
    );
    TestValidator.notEquals(
      "snapshot has role reference",
      firstSnapshot.role,
      undefined,
    );
    TestValidator.notEquals(
      "snapshot has department reference",
      firstSnapshot.department,
      undefined,
    );
    // Validate denormalized references have correct structure
    TestValidator.notEquals(
      "user reference has id field",
      firstSnapshot.user.id,
      undefined,
    );
    TestValidator.equals(
      "user reference has email field",
      typeof firstSnapshot.user.email,
      "string",
    );
    TestValidator.notEquals(
      "organization reference has id field",
      firstSnapshot.organization.id,
      undefined,
    );
    TestValidator.notEquals(
      "organization reference has name field",
      firstSnapshot.organization.name,
      undefined,
    );
    TestValidator.notEquals(
      "role reference has id field",
      firstSnapshot.role.id,
      undefined,
    );
    TestValidator.notEquals(
      "role reference has name field",
      firstSnapshot.role.name,
      undefined,
    );
    TestValidator.notEquals(
      "department reference has id field (or is null)",
      firstSnapshot.department?.id,
      undefined,
    );
    // Validate sorting: created_at should be in descending order by default
    for (let i = 1; i < snapshotsResponse.data.length; i++) {
      TestValidator.predicate(
        "snapshots sorted by created_at descending",
        new Date(snapshotsResponse.data[i - 1].created_at) >=
          new Date(snapshotsResponse.data[i].created_at),
      );
    }
  } else {
    // When no snapshots exist, verify pagination shows zero records
    TestValidator.equals(
      "zero snapshots returns correct records count",
      snapshotsResponse.pagination.records,
      0,
    );
    TestValidator.equals(
      "zero snapshots returns correct pages count",
      snapshotsResponse.pagination.pages,
      0,
    );
  }
  // 6. Test pagination with custom limit
  const customLimit = 50;
  const customLimitResponse =
    await api.functional.hrmPlatform.member.employees.snapshots.index(
      memberConnection,
      {
        employeeId,
        body: {
          limit: customLimit,
          page: 1,
        } satisfies IHrmPlatformEmployeesSnapshot.IRequest,
      },
    );
  typia.assert(customLimitResponse);
  TestValidator.equals(
    "custom limit respected in pagination",
    customLimitResponse.pagination.limit,
    customLimit,
  );
  // 7. Test maximum limit enforcement (max should be 100)
  const maxLimit = 100;
  const maxLimitResponse =
    await api.functional.hrmPlatform.member.employees.snapshots.index(
      memberConnection,
      {
        employeeId,
        body: {
          limit: maxLimit,
          page: 1,
        } satisfies IHrmPlatformEmployeesSnapshot.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit enforced in pagination",
    maxLimitResponse.pagination.limit,
    maxLimit,
  );
  // 8. Test status filter
  const statusFilterResponse =
    await api.functional.hrmPlatform.member.employees.snapshots.index(
      memberConnection,
      {
        employeeId,
        body: {
          status: "active",
          limit: 20,
        } satisfies IHrmPlatformEmployeesSnapshot.IRequest,
      },
    );
  typia.assert(statusFilterResponse);
  // Verify all returned snapshots match the filter (if any exist)
  if (statusFilterResponse.data.length > 0) {
    TestValidator.equals(
      "all snapshots match status filter",
      statusFilterResponse.data.every((s) => s.status === "active"),
      true,
    );
  }
  // 9. Test employment_type filter
  const employmentTypeFilterResponse =
    await api.functional.hrmPlatform.member.employees.snapshots.index(
      memberConnection,
      {
        employeeId,
        body: {
          employment_type: "full-time",
          limit: 20,
        } satisfies IHrmPlatformEmployeesSnapshot.IRequest,
      },
    );
  typia.assert(employmentTypeFilterResponse);
  if (employmentTypeFilterResponse.data.length > 0) {
    TestValidator.equals(
      "all snapshots match employment_type filter",
      employmentTypeFilterResponse.data.every(
        (s) => s.employment_type === "full-time",
      ),
      true,
    );
  }
  // 10. Test date range filter
  const startDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const endDate = new Date().toISOString();
  const dateRangeFilterResponse =
    await api.functional.hrmPlatform.member.employees.snapshots.index(
      memberConnection,
      {
        employeeId,
        body: {
          startDate,
          endDate,
          limit: 20,
        } satisfies IHrmPlatformEmployeesSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeFilterResponse);
  if (dateRangeFilterResponse.data.length > 0) {
    TestValidator.equals(
      "all snapshots within date range",
      dateRangeFilterResponse.data.every(
        (s) =>
          new Date(s.created_at) >= new Date(startDate) &&
          new Date(s.created_at) <= new Date(endDate),
      ),
      true,
    );
  }
  // 11. Test sorting by created_at ascending
  const ascendingSortResponse =
    await api.functional.hrmPlatform.member.employees.snapshots.index(
      memberConnection,
      {
        employeeId,
        body: {
          sortBy: "created_at",
          sortOrder: "asc",
          limit: 20,
        } satisfies IHrmPlatformEmployeesSnapshot.IRequest,
      },
    );
  typia.assert(ascendingSortResponse);
  if (ascendingSortResponse.data.length > 1) {
    TestValidator.predicate(
      "snapshots sorted by created_at ascending",
      new Date(ascendingSortResponse.data[0].created_at) <=
        new Date(ascendingSortResponse.data[1].created_at),
    );
  }
}
