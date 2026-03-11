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

export async function test_api_admin_roles_promotion_status(
  connection: api.IConnection,
): Promise<void> {
  // ========== STEP 1: Create Admin Accounts ==========
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Auth = await authorize_admin_join(admin1Connection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@admin.test.com",
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(admin1Auth);
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Auth = await authorize_admin_join(admin2Connection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@admin.test.com",
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(admin2Auth);
  // ========== STEP 2: Attempt to Promote admin2 with admin1 ==========
  const promoteConnection: api.IConnection = { host: connection.host };
  promoteConnection.headers = {
    ...admin1Connection.headers,
    Authorization: admin1Auth.token.access,
  };
  const promotedRole =
    await api.functional.economicPoliticalBoard.admin.roles.promote(
      promoteConnection,
      {
        roleId: admin2Auth.id,
      },
    );
  typia.assert(promotedRole);
  TestValidator.equals("promoted grade is super", promotedRole.grade, "super");
  TestValidator.predicate(
    "promoted_at is not null",
    promotedRole.promoted_at !== null,
  );
  TestValidator.predicate(
    "promoted_by_user exists",
    promotedRole.promotedByUser !== null,
  );
  // ========== STEP 3: Query with hasPromotion=true ==========
  const queryConnection1: api.IConnection = { host: connection.host };
  queryConnection1.headers = {
    ...promoteConnection.headers,
    Authorization: admin1Auth.token.access,
  };
  const promotedResult =
    await api.functional.economicPoliticalBoard.admin.roles.index(
      queryConnection1,
      {
        body: {
          hasPromotion: true,
          limit: 100,
        } satisfies IEconomicPoliticalBoardAdministratorRole.IRequest,
      },
    );
  typia.assert(promotedResult);
  TestValidator.equals(
    "promoted results total count",
    promotedResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "promoted results data length",
    promotedResult.data.length,
    1,
  );
  TestValidator.equals(
    "promoted result is admin2",
    promotedResult.data[0].id,
    admin2Auth.id,
  );
  const promotedAdmin = promotedResult.data[0];
  if (promotedAdmin.promoted_at !== null) {
    TestValidator.predicate(
      "promoted admin has promoted_at timestamp",
      typeof promotedAdmin.promoted_at === "string",
    );
  }
  if (
    promotedAdmin.promoted_by_user !== null &&
    promotedAdmin.promoted_by_user !== undefined
  ) {
    TestValidator.equals(
      "promoted_by_user id matches admin1",
      promotedAdmin.promoted_by_user.id,
      admin1Auth.id,
    );
  }
  // ========== STEP 4: Query with hasPromotion=false ==========
  const queryConnection2: api.IConnection = { host: connection.host };
  queryConnection2.headers = {
    ...promoteConnection.headers,
    Authorization: admin1Auth.token.access,
  };
  const nonPromotedResult =
    await api.functional.economicPoliticalBoard.admin.roles.index(
      queryConnection2,
      {
        body: {
          hasPromotion: false,
          limit: 100,
        } satisfies IEconomicPoliticalBoardAdministratorRole.IRequest,
      },
    );
  typia.assert(nonPromotedResult);
  TestValidator.equals(
    "non-promoted results total count",
    nonPromotedResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "non-promoted results data length",
    nonPromotedResult.data.length,
    1,
  );
  TestValidator.equals(
    "non-promoted result is admin1",
    nonPromotedResult.data[0].id,
    admin1Auth.id,
  );
  const nonPromotedAdmin = nonPromotedResult.data[0];
  TestValidator.equals(
    "non-promoted admin promoted_at is null",
    nonPromotedAdmin.promoted_at,
    null,
  );
  TestValidator.equals(
    "non-promoted admin promoted_by_user is null",
    nonPromotedAdmin.promoted_by_user,
    null,
  );
  // ========== STEP 5: Test sorting by promoted_at ==========
  const queryConnection3: api.IConnection = { host: connection.host };
  queryConnection3.headers = {
    ...promoteConnection.headers,
    Authorization: admin1Auth.token.access,
  };
  const sortedResult =
    await api.functional.economicPoliticalBoard.admin.roles.index(
      queryConnection3,
      {
        body: {
          hasPromotion: true,
          sortBy: "promoted_at",
          sortOrder: "desc",
          limit: 100,
        } satisfies IEconomicPoliticalBoardAdministratorRole.IRequest,
      },
    );
  typia.assert(sortedResult);
  TestValidator.equals(
    "sorted promoted result order",
    sortedResult.data[0].id,
    admin2Auth.id,
  );
  // ========== STEP 6: Test combined filtering (grade + hasPromotion) ==========
  const queryConnection4: api.IConnection = { host: connection.host };
  queryConnection4.headers = {
    ...promoteConnection.headers,
    Authorization: admin1Auth.token.access,
  };
  const combinedResult =
    await api.functional.economicPoliticalBoard.admin.roles.index(
      queryConnection4,
      {
        body: {
          grade: "super",
          hasPromotion: true,
          limit: 100,
        } satisfies IEconomicPoliticalBoardAdministratorRole.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined filter results count",
    combinedResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "combined filter result is admin2",
    combinedResult.data[0].id,
    admin2Auth.id,
  );
  // ========== STEP 7: Test pagination metadata ==========
  const paginationConnection: api.IConnection = { host: connection.host };
  paginationConnection.headers = {
    ...promoteConnection.headers,
    Authorization: admin1Auth.token.access,
  };
  const paginationResult =
    await api.functional.economicPoliticalBoard.admin.roles.index(
      paginationConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IEconomicPoliticalBoardAdministratorRole.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResult.pagination.limit,
    50,
  );
  TestValidator.equals(
    "pagination total records",
    paginationResult.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination total pages",
    paginationResult.pagination.pages,
    1,
  );
  // ========== STEP 8: Test with no promoted admins (edge case) ==========
  // This tests when hasPromotion=true returns empty data
  const noPromotedConnection: api.IConnection = { host: connection.host };
  noPromotedConnection.headers = {
    ...promoteConnection.headers,
    Authorization: admin1Auth.token.access,
  };
  // Create another admin and test filtering before promoting
  const admin3Connection: api.IConnection = { host: connection.host };
  const admin3Auth = await authorize_admin_join(admin3Connection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@admin.test.com",
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(admin3Auth);
  // Query hasPromotion=true should include admin3 as not promoted (promoted_at = null)
  // Actually after promotion, admin2 should be promoted and admin3 not
  const allQueryConnection: api.IConnection = { host: connection.host };
  allQueryConnection.headers = {
    ...promoteConnection.headers,
    Authorization: admin1Auth.token.access,
  };
  const allResult =
    await api.functional.economicPoliticalBoard.admin.roles.index(
      allQueryConnection,
      {
        body: {
          limit: 100,
        } satisfies IEconomicPoliticalBoardAdministratorRole.IRequest,
      },
    );
  typia.assert(allResult);
  TestValidator.predicate(
    "total admins at least 2",
    allResult.pagination.records >= 2,
  );
}
