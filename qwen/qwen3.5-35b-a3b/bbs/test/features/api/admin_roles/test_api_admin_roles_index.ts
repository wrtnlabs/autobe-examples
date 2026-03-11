import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
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

export async function test_api_admin_roles_index(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      displayName: RandomGenerator.name(),
      href: "https://example.com/admin",
      referrer: "https://example.com",
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test default request - retrieve all admins
  const allAdmins =
    await api.functional.economicPoliticalBoard.admin.roles.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(allAdmins);
  // Validate pagination metadata
  TestValidator.equals("pagination current", allAdmins.pagination.current, 1);
  TestValidator.equals("pagination limit", allAdmins.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    allAdmins.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages",
    allAdmins.pagination.pages,
    allAdmins.pagination.records === 0 || allAdmins.pagination.limit === 0
      ? 0
      : Math.ceil(allAdmins.pagination.records / allAdmins.pagination.limit),
  );
  // Validate response data structure
  TestValidator.predicate("data is array", Array.isArray(allAdmins.data));
  if (allAdmins.data.length > 0) {
    const firstAdmin = allAdmins.data[0];
    typia.assert(firstAdmin);
    TestValidator.predicate(
      "grade is regular or super",
      firstAdmin.grade === "regular" || firstAdmin.grade === "super",
    );
    TestValidator.predicate(
      "created_at is valid date-time",
      !!(
        firstAdmin.created_at &&
        !Number.isNaN(Date.parse(firstAdmin.created_at))
      ),
    );
    TestValidator.predicate(
      "updated_at is valid date-time",
      !!(
        firstAdmin.updated_at &&
        !Number.isNaN(Date.parse(firstAdmin.updated_at))
      ),
    );
  }
  // 3. Test filtering by grade - regular admins
  const regularAdmins =
    await api.functional.economicPoliticalBoard.admin.roles.index(
      adminConnection,
      {
        body: { grade: "regular" },
      },
    );
  typia.assert(regularAdmins);
  TestValidator.equals(
    "filter grade regular count",
    regularAdmins.data.length,
    regularAdmins.data.filter((a) => a.grade === "regular").length,
  );
  // 4. Test filtering by grade - super admins
  const superAdmins =
    await api.functional.economicPoliticalBoard.admin.roles.index(
      adminConnection,
      {
        body: { grade: "super" },
      },
    );
  typia.assert(superAdmins);
  TestValidator.equals(
    "filter grade super count",
    superAdmins.data.length,
    superAdmins.data.filter((a) => a.grade === "super").length,
  );
  // 5. Test filtering by promotion status - has promotion
  const promotedAdmins =
    await api.functional.economicPoliticalBoard.admin.roles.index(
      adminConnection,
      {
        body: { hasPromotion: true },
      },
    );
  typia.assert(promotedAdmins);
  TestValidator.equals(
    "filter hasPromotion=true count",
    promotedAdmins.data.length,
    promotedAdmins.data.filter(
      (a) => a.promoted_at !== null && a.promoted_at !== undefined,
    ).length,
  );
  // 6. Test filtering by promotion status - no promotion
  const nonPromotedAdmins =
    await api.functional.economicPoliticalBoard.admin.roles.index(
      adminConnection,
      {
        body: { hasPromotion: false },
      },
    );
  typia.assert(nonPromotedAdmins);
  TestValidator.equals(
    "filter hasPromotion=false count",
    nonPromotedAdmins.data.length,
    nonPromotedAdmins.data.filter(
      (a) => a.promoted_at === null || a.promoted_at === undefined,
    ).length,
  );
  // 7. Test pagination - page 2
  const page2Admins =
    await api.functional.economicPoliticalBoard.admin.roles.index(
      adminConnection,
      {
        body: { page: 2, limit: 10 },
      },
    );
  typia.assert(page2Admins);
  TestValidator.equals("page 2 current", page2Admins.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Admins.pagination.limit, 10);
  // 8. Test pagination limit
  const customLimitAdmins =
    await api.functional.economicPoliticalBoard.admin.roles.index(
      adminConnection,
      {
        body: { limit: 5 },
      },
    );
  typia.assert(customLimitAdmins);
  TestValidator.equals("custom limit 5", customLimitAdmins.pagination.limit, 5);
  // 9. Test sorting by created_at descending (default)
  const sortedByCreatedAt =
    await api.functional.economicPoliticalBoard.admin.roles.index(
      adminConnection,
      {
        body: { sortBy: "created_at", sortOrder: "desc" },
      },
    );
  typia.assert(sortedByCreatedAt);
  if (sortedByCreatedAt.data.length > 1) {
    for (let i = 1; i < sortedByCreatedAt.data.length; i++) {
      TestValidator.predicate(
        `sorted by created_at desc index ${i}`,
        new Date(sortedByCreatedAt.data[i - 1].created_at) >=
          new Date(sortedByCreatedAt.data[i].created_at),
      );
    }
  }
  // 10. Test sorting by created_at ascending
  const sortedByCreatedAtAsc =
    await api.functional.economicPoliticalBoard.admin.roles.index(
      adminConnection,
      {
        body: { sortBy: "created_at", sortOrder: "asc" },
      },
    );
  typia.assert(sortedByCreatedAtAsc);
  if (sortedByCreatedAtAsc.data.length > 1) {
    for (let i = 1; i < sortedByCreatedAtAsc.data.length; i++) {
      TestValidator.predicate(
        `sorted by created_at asc index ${i}`,
        new Date(sortedByCreatedAtAsc.data[i - 1].created_at) <=
          new Date(sortedByCreatedAtAsc.data[i].created_at),
      );
    }
  }
  // 11. Test sorting by promoted_at ascending
  const sortedByPromotedAtAsc =
    await api.functional.economicPoliticalBoard.admin.roles.index(
      adminConnection,
      {
        body: { sortBy: "promoted_at", sortOrder: "asc" },
      },
    );
  typia.assert(sortedByPromotedAtAsc);
  // 12. Test sorting by promoted_at descending
  const sortedByPromotedAtDesc =
    await api.functional.economicPoliticalBoard.admin.roles.index(
      adminConnection,
      {
        body: { sortBy: "promoted_at", sortOrder: "desc" },
      },
    );
  typia.assert(sortedByPromotedAtDesc);
}
