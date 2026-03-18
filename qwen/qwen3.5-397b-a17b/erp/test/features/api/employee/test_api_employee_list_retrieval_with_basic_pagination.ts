import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_list_retrieval_with_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${memberAuth.token.access}`,
    },
  };
  // 3. Test default pagination (no parameters)
  const defaultResult = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {} satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(defaultResult);
  // 4. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination exists",
    defaultResult.pagination !== null,
  );
  TestValidator.predicate(
    "current page >= 1",
    defaultResult.pagination.current >= 1,
  );
  TestValidator.predicate("limit > 0", defaultResult.pagination.limit > 0);
  TestValidator.predicate(
    "records >= 0",
    defaultResult.pagination.records >= 0,
  );
  TestValidator.predicate("pages >= 0", defaultResult.pagination.pages >= 0);
  // 5. Validate data array exists
  TestValidator.predicate("data is array", Array.isArray(defaultResult.data));
  // 6. Test different page sizes
  const pageSizes = [10, 20, 50] as const;
  for (const limit of pageSizes) {
    const paginatedResult =
      await api.functional.hrmPlatform.member.employees.index(
        memberConnection,
        {
          body: {
            limit: (limit ?? 0) satisfies number as number,
          } satisfies IHrmPlatformEmployee.IRequest,
        },
      );
    typia.assert(paginatedResult);
    TestValidator.equals(
      `limit ${limit} respected`,
      paginatedResult.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `data length <= limit ${limit}`,
      paginatedResult.data.length <= limit,
    );
  }
  // 7. Test sorting by display_name ascending
  const sortedAsc = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        sort: "display_name",
        direction: "asc",
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(sortedAsc);
  // Validate ascending order
  if (sortedAsc.data.length > 1) {
    for (let i = 1; i < sortedAsc.data.length; i++) {
      TestValidator.predicate(
        `display_name ascending order [${i - 1}] <= [${i}]`,
        sortedAsc.data[i - 1].display_name.toLowerCase() <=
          sortedAsc.data[i].display_name.toLowerCase(),
      );
    }
  }
  // 8. Test sorting by display_name descending
  const sortedDesc = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        sort: "display_name",
        direction: "desc",
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(sortedDesc);
  // Validate descending order
  if (sortedDesc.data.length > 1) {
    for (let i = 1; i < sortedDesc.data.length; i++) {
      TestValidator.predicate(
        `display_name descending order [${i - 1}] >= [${i}]`,
        sortedDesc.data[i - 1].display_name.toLowerCase() >=
          sortedDesc.data[i].display_name.toLowerCase(),
      );
    }
  }
  // 9. Test status filter for active employees (default behavior)
  const activeOnly = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        status: "active",
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(activeOnly);
  // Verify all returned employees have active status
  for (const employee of activeOnly.data) {
    TestValidator.equals(
      `employee ${employee.display_name} status is active`,
      employee.status,
      "active",
    );
  }
  // 10. Validate employee summary structure - business logic checks only
  // typia.assert() already validates all types, UUIDs, and required fields
  for (const employee of defaultResult.data) {
    // Business logic validations only (not type validations)
    TestValidator.predicate(
      "display_name is not empty",
      employee.display_name.length > 0,
    );
    TestValidator.predicate(
      "employment_type is valid enum value",
      ["full-time", "part-time", "contractor", "intern"].includes(
        employee.employment_type,
      ),
    );
    TestValidator.predicate(
      "status is valid enum value",
      ["active", "deactivated"].includes(employee.status),
    );
    TestValidator.predicate(
      "role name is not empty",
      employee.role.name.length > 0,
    );
    // Department is nullable - check structure if exists
    if (employee.department !== null) {
      TestValidator.predicate(
        "department name is not empty",
        employee.department.name.length > 0,
      );
    }
  }
  // 11. Test page navigation
  if (defaultResult.pagination.pages > 1) {
    const page2Result = await api.functional.hrmPlatform.member.employees.index(
      memberConnection,
      {
        body: {
          page: 2,
        } satisfies IHrmPlatformEmployee.IRequest,
      },
    );
    typia.assert(page2Result);
    TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  }
}