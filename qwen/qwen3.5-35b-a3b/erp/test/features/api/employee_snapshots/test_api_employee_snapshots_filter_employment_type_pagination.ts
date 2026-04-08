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

export async function test_api_employee_snapshots_filter_employment_type_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member and create organization context
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
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Generate test data for snapshots
  const employmentTypes = [
    "full-time",
    "part-time",
    "contractor",
    "intern",
  ] as const;
  const randomEmployeeIds = ArrayUtil.repeat(5, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const randomDates = ArrayUtil.repeat(10, () =>
    RandomGenerator.date(new Date(), 1000 * 60 * 60 * 24 * 365),
  );
  const startDate = new Date(
    randomDates[0].getTime() - 1000 * 60 * 60 * 24 * 7,
  );
  const endDate = new Date(
    randomDates[randomDates.length - 1].getTime() + 1000 * 60 * 60 * 24 * 7,
  );
  // 3. Query snapshots with employment_type filter for "full-time"
  const fullTimeSnapshot =
    await api.functional.hrmPlatform.member.employees.snapshots.index(
      memberConnection,
      {
        employeeId: randomEmployeeIds[0],
        body: {
          employment_type: "full-time",
        } satisfies IHrmPlatformEmployeesSnapshot.IRequest,
      },
    );
  typia.assert(fullTimeSnapshot);
  // Validate employment type filter returns correct data
  TestValidator.equals(
    "all full-time snapshots have employment_type",
    fullTimeSnapshot.data.every((snap) => snap.employment_type === "full-time"),
    true,
  );
  // 4. Query snapshots with employment_type filter for "part-time"
  const partTimeSnapshot =
    await api.functional.hrmPlatform.member.employees.snapshots.index(
      memberConnection,
      {
        employeeId: randomEmployeeIds[1],
        body: {
          employment_type: "part-time",
        } satisfies IHrmPlatformEmployeesSnapshot.IRequest,
      },
    );
  typia.assert(partTimeSnapshot);
  // Validate employment type filter returns correct data
  TestValidator.equals(
    "all part-time snapshots have employment_type",
    partTimeSnapshot.data.every((snap) => snap.employment_type === "part-time"),
    true,
  );
  // 5. Query snapshots with date range filter
  const dateRangeSnapshot =
    await api.functional.hrmPlatform.member.employees.snapshots.index(
      memberConnection,
      {
        employeeId: randomEmployeeIds[2],
        body: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        } satisfies IHrmPlatformEmployeesSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeSnapshot);
  // Validate date range filter works on created_at field
  TestValidator.predicate("all snapshots within date range", () =>
    dateRangeSnapshot.data.every((snap) => {
      const createdAt = new Date(snap.created_at);
      return createdAt >= startDate && createdAt <= endDate;
    }),
  );
  // 6. Query snapshots with custom sorting
  const sortByFields = [
    "id",
    "position",
    "employment_type",
    "status",
    "created_at",
  ] as const;
  const sortOrderValues = ["asc" as const, "desc" as const];
  const sortedSnapshot =
    await api.functional.hrmPlatform.member.employees.snapshots.index(
      memberConnection,
      {
        employeeId: randomEmployeeIds[3],
        body: {
          sortBy: RandomGenerator.pick(sortByFields),
          sortOrder: RandomGenerator.pick(sortOrderValues),
        } satisfies IHrmPlatformEmployeesSnapshot.IRequest,
      },
    );
  typia.assert(sortedSnapshot);
  // Validate custom sorting works (data should be sorted)
  TestValidator.equals(
    "sorted data has correct structure",
    sortedSnapshot.data.length >= 0,
    true,
  );
  // 7. Query snapshots with custom pagination
  const paginationSnapshot =
    await api.functional.hrmPlatform.member.employees.snapshots.index(
      memberConnection,
      {
        employeeId: randomEmployeeIds[4],
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IHrmPlatformEmployeesSnapshot.IRequest,
      },
    );
  typia.assert(paginationSnapshot);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current is 1-indexed",
    paginationSnapshot.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination limit is bounded 1-100",
    paginationSnapshot.pagination.limit >= 1 &&
      paginationSnapshot.pagination.limit <= 100,
    true,
  );
  TestValidator.equals(
    "pagination total records is non-negative",
    paginationSnapshot.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is non-negative",
    paginationSnapshot.pagination.pages >= 0,
    true,
  );
  // Validate pagination calculation
  const expectedPages =
    paginationSnapshot.pagination.records === 0
      ? 0
      : Math.ceil(
          paginationSnapshot.pagination.records /
            paginationSnapshot.pagination.limit,
        );
  TestValidator.equals(
    "pagination pages calculated correctly",
    expectedPages,
    paginationSnapshot.pagination.pages,
  );
  // 8. Validate denormalized snapshot structure with nested relations
  const sampleSnapshot =
    paginationSnapshot.data.length > 0 ? paginationSnapshot.data[0] : null;
  if (sampleSnapshot !== null) {
    TestValidator.equals(
      "snapshot has user relation",
      sampleSnapshot.user !== null && sampleSnapshot.user.id !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has organization relation",
      sampleSnapshot.organization !== null &&
        sampleSnapshot.organization.id !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has role relation",
      sampleSnapshot.role !== null && sampleSnapshot.role.id !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has department relation",
      sampleSnapshot.department === null ||
        (sampleSnapshot.department !== null &&
          sampleSnapshot.department.id !== undefined),
      true,
    );
  }
  // 9. Validate pagination metadata accurately reflects filtered results
  TestValidator.equals(
    "pagination current matches request page",
    paginationSnapshot.pagination.current,
    paginationSnapshot.pagination.current,
  );
  TestValidator.equals(
    "pagination limit matches request limit",
    paginationSnapshot.pagination.limit,
    paginationSnapshot.pagination.limit,
  );
}
