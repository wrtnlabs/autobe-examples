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

export async function test_api_employee_snapshots_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to create organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000/join",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create member-specific connection with token
  const memberAuthConnection: api.IConnection = { host: connection.host };
  memberAuthConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  // Use a valid employee UUID for testing (assume test data exists)
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  // 2. Query snapshots with status="active"
  const activeSnapshots =
    await api.functional.hrmPlatform.member.employees.snapshots.index(
      memberAuthConnection,
      {
        employeeId,
        body: {
          status: "active" as const,
          limit: 20 as const,
          page: 1 as const,
        } satisfies IHrmPlatformEmployeesSnapshot.IRequest,
      },
    );
  typia.assert(activeSnapshots);
  // 3. Query snapshots with status="deactivated"
  const deactivatedSnapshots =
    await api.functional.hrmPlatform.member.employees.snapshots.index(
      memberAuthConnection,
      {
        employeeId,
        body: {
          status: "deactivated" as const,
          limit: 20 as const,
          page: 1 as const,
        } satisfies IHrmPlatformEmployeesSnapshot.IRequest,
      },
    );
  typia.assert(deactivatedSnapshots);
  // 4. Query snapshots without status filter (all)
  const allSnapshots =
    await api.functional.hrmPlatform.member.employees.snapshots.index(
      memberAuthConnection,
      {
        employeeId,
        body: {
          limit: 100 as const,
          page: 1 as const,
        } satisfies IHrmPlatformEmployeesSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // 5. Validate response structure - pagination metadata
  TestValidator.equals(
    "active snapshots pagination current",
    activeSnapshots.pagination.current,
    1,
  );
  TestValidator.predicate(
    "active snapshots pagination records >= 0",
    activeSnapshots.pagination.records >= 0,
  );
  TestValidator.equals(
    "active snapshots pagination limit",
    activeSnapshots.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "active snapshots pagination pages >= 0",
    activeSnapshots.pagination.pages >= 0,
  );
  TestValidator.equals(
    "deactivated snapshots pagination current",
    deactivatedSnapshots.pagination.current,
    1,
  );
  TestValidator.predicate(
    "deactivated snapshots pagination records >= 0",
    deactivatedSnapshots.pagination.records >= 0,
  );
  TestValidator.equals(
    "deactivated snapshots pagination limit",
    deactivatedSnapshots.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "deactivated snapshots pagination pages >= 0",
    deactivatedSnapshots.pagination.pages >= 0,
  );
  TestValidator.equals(
    "all snapshots pagination current",
    allSnapshots.pagination.current,
    1,
  );
  TestValidator.predicate(
    "all snapshots pagination records >= 0",
    allSnapshots.pagination.records >= 0,
  );
  TestValidator.equals(
    "all snapshots pagination limit",
    allSnapshots.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "all snapshots pagination pages >= 0",
    allSnapshots.pagination.pages >= 0,
  );
  // 6. Validate filtering results
  // Total records should equal the sum of filtered results
  const totalFiltered =
    activeSnapshots.pagination.records +
    deactivatedSnapshots.pagination.records;
  // If both active and deactivated snapshots exist, total should match
  if (
    activeSnapshots.pagination.records > 0 ||
    deactivatedSnapshots.pagination.records > 0
  ) {
    TestValidator.equals(
      "total filtered matches sum of active and deactivated",
      allSnapshots.pagination.records,
      totalFiltered,
    );
  }
  // 7. Validate sorting - created_at should be in descending order
  if (allSnapshots.data.length > 1) {
    for (let i = 1; i < allSnapshots.data.length; i++) {
      const prevDate = new Date(allSnapshots.data[i - 1].created_at);
      const currDate = new Date(allSnapshots.data[i].created_at);
      TestValidator.predicate(
        `sorting: ${i}th snapshot created_at <= ${i - 1}th snapshot created_at`,
        currDate <= prevDate,
      );
    }
  }
  // 8. Validate that status filter works correctly
  if (activeSnapshots.data.length > 0) {
    for (const snapshot of activeSnapshots.data) {
      TestValidator.equals(
        "snapshot in active filter has correct status",
        snapshot.status,
        "active",
      );
    }
  }
  if (deactivatedSnapshots.data.length > 0) {
    for (const snapshot of deactivatedSnapshots.data) {
      TestValidator.equals(
        "snapshot in deactivated filter has correct status",
        snapshot.status,
        "deactivated",
      );
    }
  }
  // 9. Validate nested reference structure
  if (allSnapshots.data.length > 0) {
    const sampleSnapshot = allSnapshots.data[0];
    // Validate user reference
    TestValidator.predicate(
      "snapshot user reference exists",
      sampleSnapshot.user.id !== undefined,
    );
    // Validate organization reference
    TestValidator.predicate(
      "snapshot organization reference exists",
      sampleSnapshot.organization.id !== undefined,
    );
    // Validate role reference
    TestValidator.predicate(
      "snapshot role reference exists",
      sampleSnapshot.role.id !== undefined,
    );
    // Validate department reference (can be null)
    if (sampleSnapshot.department !== null) {
      TestValidator.predicate(
        "snapshot non-null department reference exists",
        sampleSnapshot.department.id !== undefined,
      );
    }
  }
  // 10. Validate status filter doesn't affect other filters
  // Query with status and employment_type together
  const filteredMixed =
    await api.functional.hrmPlatform.member.employees.snapshots.index(
      memberAuthConnection,
      {
        employeeId,
        body: {
          status: "active" as const,
          employment_type: "full-time" as const,
          limit: 20 as const,
          page: 1 as const,
        } satisfies IHrmPlatformEmployeesSnapshot.IRequest,
      },
    );
  typia.assert(filteredMixed);
  // All results should have status=active
  if (filteredMixed.data.length > 0) {
    for (const snapshot of filteredMixed.data) {
      TestValidator.equals(
        "mixed filter snapshot has correct status",
        snapshot.status,
        "active",
      );
    }
  }
}
