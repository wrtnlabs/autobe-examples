import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardAdministratorRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_administrator_roles_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const adminAuth = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create admin connection with token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // 3. Call the API to get administrator roles
  const result =
    await api.functional.economicPoliticalBoard.admin.administrator_roles.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(result);
  // 4. Validate pagination metadata
  const pagination = result.pagination;
  TestValidator.predicate(
    "pagination has valid current",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination has valid limit", pagination.limit > 0);
  TestValidator.predicate(
    "pagination has valid records",
    pagination.records >= 0,
  );
  TestValidator.predicate("pagination has valid pages", pagination.pages >= 0);
  // 5. Validate data array structure
  if (result.data.length > 0) {
    const firstAdmin = result.data[0];
    typia.assert(firstAdmin);
    // Check required fields exist and are non-undefined
    TestValidator.predicate("admin has valid id", firstAdmin.id !== undefined);
    TestValidator.predicate(
      "admin has valid userId",
      firstAdmin.userId !== undefined,
    );
    TestValidator.predicate(
      "admin has valid grade",
      firstAdmin.grade !== undefined,
    );
    TestValidator.predicate(
      "admin has valid promotedByUserId (nullable OK)",
      firstAdmin.promotedByUserId === null ||
        firstAdmin.promotedByUserId !== undefined,
    );
    TestValidator.predicate(
      "admin has valid promotedAt (nullable OK)",
      firstAdmin.promotedAt === null || firstAdmin.promotedAt !== undefined,
    );
    TestValidator.predicate(
      "admin has valid createdAt",
      firstAdmin.createdAt !== undefined,
    );
    TestValidator.predicate(
      "admin has valid updatedAt",
      firstAdmin.updatedAt !== undefined,
    );
    // Check user object
    typia.assert(firstAdmin.user);
    TestValidator.predicate(
      "user has valid id",
      firstAdmin.user.id !== undefined,
    );
    TestValidator.predicate(
      "user has valid email",
      firstAdmin.user.email !== undefined,
    );
    TestValidator.predicate(
      "user has valid displayName",
      firstAdmin.user.displayName !== undefined,
    );
    TestValidator.predicate(
      "user has valid bio",
      firstAdmin.user.bio !== undefined,
    );
  }
  // 6. Test default sorting (created_at DESC)
  const resultSorted =
    await api.functional.economicPoliticalBoard.admin.administrator_roles.index(
      adminConnection,
      {
        body: { sort: "created_at", direction: "DESC" },
      },
    );
  typia.assert(resultSorted);
  TestValidator.predicate(
    "sorted result has valid pagination",
    resultSorted.pagination.records >= 0,
  );
  // 7. Test sorting by promoted_at ASC
  const resultPromotedAsc =
    await api.functional.economicPoliticalBoard.admin.administrator_roles.index(
      adminConnection,
      {
        body: { sort: "promoted_at", direction: "ASC" },
      },
    );
  typia.assert(resultPromotedAsc);
  // 8. Test sorting by promoted_at DESC
  const resultPromotedDesc =
    await api.functional.economicPoliticalBoard.admin.administrator_roles.index(
      adminConnection,
      {
        body: { sort: "promoted_at", direction: "DESC" },
      },
    );
  typia.assert(resultPromotedDesc);
  // 9. Test sorting by grade ASC
  const resultGradeAsc =
    await api.functional.economicPoliticalBoard.admin.administrator_roles.index(
      adminConnection,
      {
        body: { sort: "grade", direction: "ASC" },
      },
    );
  typia.assert(resultGradeAsc);
  // 10. Test sorting by grade DESC
  const resultGradeDesc =
    await api.functional.economicPoliticalBoard.admin.administrator_roles.index(
      adminConnection,
      {
        body: { sort: "grade", direction: "DESC" },
      },
    );
  typia.assert(resultGradeDesc);
  // 11. Test pagination (page 2 with limit 5)
  const resultPage2 =
    await api.functional.economicPoliticalBoard.admin.administrator_roles.index(
      adminConnection,
      {
        body: { page: 2, limit: 5 },
      },
    );
  typia.assert(resultPage2);
  TestValidator.equals("page 2 current", resultPage2.pagination.current, 2);
  TestValidator.equals("page 2 limit", resultPage2.pagination.limit, 5);
}