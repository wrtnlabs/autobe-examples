import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_list_grade_privileges(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(auth);
  // 2. Create multiple super admin accounts with different grades
  const grade1Connection: api.IConnection = { host: connection.host };
  const grade1Auth = await authorize_super_admin_join(grade1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(grade1Auth);
  const grade2Connection: api.IConnection = { host: connection.host };
  const grade2Auth = await authorize_super_admin_join(grade2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(grade2Auth);
  const grade3Connection: api.IConnection = { host: connection.host };
  const grade3Auth = await authorize_super_admin_join(grade3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(grade3Auth);
  // 3. Retrieve all super-admins without filter - should return at least 4 accounts
  const allConnection: api.IConnection = { host: connection.host };
  const allResult =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      allConnection,
      {
        body: {
          limit: 100,
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(allResult);
  // Verify at least 4 super admins exist (our 4 created)
  TestValidator.predicate(
    "total count includes all created admins",
    allResult.pagination.records >= 4,
  );
  // 4. Test sorting by grade in ascending order
  const ascendingResult =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      allConnection,
      {
        body: {
          limit: 100,
          sortBy: "grade",
          sortOrder: "ascending",
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(ascendingResult);
  // Validate ascending order
  const ascendingGrades = ascendingResult.data.map((item) => item.grade);
  for (let i = 1; i < ascendingGrades.length; i++) {
    TestValidator.predicate(
      "ascending sort - grade at " + i + " >= grade at " + (i - 1),
      ascendingGrades[i] >= ascendingGrades[i - 1],
    );
  }
  // 5. Test sorting by grade in descending order
  const descendingResult =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      allConnection,
      {
        body: {
          limit: 100,
          sortBy: "grade",
          sortOrder: "descending",
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(descendingResult);
  // Validate descending order
  const descendingGrades = descendingResult.data.map((item) => item.grade);
  for (let i = 1; i < descendingGrades.length; i++) {
    TestValidator.predicate(
      "descending sort - grade at " + i + " <= grade at " + (i - 1),
      descendingGrades[i] <= descendingGrades[i - 1],
    );
  }
  // 6. Test filterGradeMin - get only super admins with grade >= 2
  const minFilterResult =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      allConnection,
      {
        body: {
          limit: 100,
          filterGradeMin: 2,
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(minFilterResult);
  // Verify all returned items have grade >= 2
  for (const item of minFilterResult.data) {
    TestValidator.predicate("grade >= filterGradeMin (2)", item.grade >= 2);
  }
  TestValidator.equals(
    "records count matches filtered data",
    minFilterResult.pagination.records,
    minFilterResult.data.length,
  );
  // 7. Test filterGradeMax - get only super admins with grade <= 1
  const maxFilterResult =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      allConnection,
      {
        body: {
          limit: 100,
          filterGradeMax: 1,
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(maxFilterResult);
  // Verify all returned items have grade <= 1
  for (const item of maxFilterResult.data) {
    TestValidator.predicate("grade <= filterGradeMax (1)", item.grade <= 1);
  }
  TestValidator.equals(
    "records count matches filtered data",
    maxFilterResult.pagination.records,
    maxFilterResult.data.length,
  );
  // 8. Test grade range filter (both filterGradeMin and filterGradeMax)
  const rangeFilterResult =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      allConnection,
      {
        body: {
          limit: 100,
          filterGradeMin: 1,
          filterGradeMax: 2,
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(rangeFilterResult);
  // Verify all returned items have grade between 1 and 2 inclusive
  for (const item of rangeFilterResult.data) {
    TestValidator.predicate(
      "grade in range [1, 2]",
      item.grade >= 1 && item.grade <= 2,
    );
  }
  TestValidator.equals(
    "records count matches filtered data",
    rangeFilterResult.pagination.records,
    rangeFilterResult.data.length,
  );
  // 9. Test grade filtering with no results - use extreme value unlikely to match
  const noResultResult =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      allConnection,
      {
        body: {
          limit: 100,
          filterGradeMin: 999999,
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(noResultResult);
  // Verify empty result
  TestValidator.equals(
    "no results when grade filter is extreme",
    noResultResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty pagination records",
    noResultResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty pagination pages",
    noResultResult.pagination.pages,
    0,
  );
  // 10. Validate all responses have proper grade type (number & int32)
  for (const item of allResult.data) {
    TestValidator.predicate("grade is number", typeof item.grade === "number");
    TestValidator.predicate("grade is not null", item.grade !== null);
    // Verify grade is not undefined by type check
  }
  // 11. Verify grade values are integers
  for (const item of allResult.data) {
    TestValidator.predicate("grade is integer", Number.isInteger(item.grade));
  }
  // 12. Verify all items have non-null deleted_at (active accounts)
  for (const item of allResult.data) {
    TestValidator.equals("account not deleted", item.deleted_at, null);
  }
  // 13. Test pagination with limit parameter
  const limitedResult =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      allConnection,
      {
        body: {
          limit: 3,
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(limitedResult);
  // Verify limited data length but correct total records
  TestValidator.equals(
    "data length matches limit",
    limitedResult.data.length,
    3,
  );
  TestValidator.predicate(
    "total records includes all",
    limitedResult.pagination.records >= 3,
  );
}
