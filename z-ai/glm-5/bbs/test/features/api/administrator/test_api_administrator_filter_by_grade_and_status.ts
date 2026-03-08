import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import type { IRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_administrator_filter_by_grade_and_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(superAdminAuth);
  // Promote to super grade to access admin list endpoint
  const promotedAdmin =
    await api.functional.discussionBoard.admin.admins.promote(
      superAdminConnection,
      {
        adminId: superAdminAuth.id,
        body: {
          reason: "Test promotion for filtering tests",
        } satisfies IDiscussionBoardAdmin.IPromote,
      },
    );
  typia.assert(promotedAdmin);
  // 2. Create multiple regular administrators for testing
  const regularAdmins = await ArrayUtil.asyncRepeat(3, async () => {
    const auth = await authorize_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
    typia.assert(auth);
    return auth;
  });
  // 3. Test filter by grade='regular' - should return only regular administrators
  const regularGradeResult =
    await api.functional.discussionBoard.admin.admins.index(
      superAdminConnection,
      {
        body: { grade: "regular" } satisfies IDiscussionBoardAdmin.IRequest,
      },
    );
  typia.assert(regularGradeResult);
  // Verify all returned admins have grade='regular'
  TestValidator.predicate(
    "all admins have grade='regular'",
    regularGradeResult.data.every((admin) => admin.grade === "regular"),
  );
  // Verify created regular admins are in the result
  const regularIds = regularAdmins.map((a) => a.id);
  const foundRegularIds = regularGradeResult.data.filter((admin) =>
    regularIds.includes(admin.id),
  );
  TestValidator.predicate(
    "created regular admins found in result",
    foundRegularIds.length === regularAdmins.length,
  );
  // 4. Test filter by grade='super' - should return only super administrators
  const superGradeResult =
    await api.functional.discussionBoard.admin.admins.index(
      superAdminConnection,
      {
        body: { grade: "super" } satisfies IDiscussionBoardAdmin.IRequest,
      },
    );
  typia.assert(superGradeResult);
  // Verify all returned admins have grade='super'
  TestValidator.predicate(
    "all admins have grade='super'",
    superGradeResult.data.every((admin) => admin.grade === "super"),
  );
  // Verify super admin is in the result
  TestValidator.predicate(
    "super admin found in result",
    superGradeResult.data.some((admin) => admin.id === superAdminAuth.id),
  );
  // 5. Test filter by banned=false - should return only non-banned administrators
  const nonBannedResult =
    await api.functional.discussionBoard.admin.admins.index(
      superAdminConnection,
      {
        body: { banned: false } satisfies IDiscussionBoardAdmin.IRequest,
      },
    );
  typia.assert(nonBannedResult);
  // Verify all returned admins have banned=false
  TestValidator.predicate(
    "all admins have banned=false",
    nonBannedResult.data.every((admin) => admin.banned === false),
  );
  // Verify created admins (non-banned) are in the result
  const foundNonBannedIds = nonBannedResult.data.filter(
    (admin) => regularIds.includes(admin.id) || admin.id === superAdminAuth.id,
  );
  TestValidator.predicate(
    "non-banned admins found in result",
    foundNonBannedIds.length >= regularAdmins.length,
  );
  // 6. Test filter by banned=true - should return only banned administrators
  const bannedResult = await api.functional.discussionBoard.admin.admins.index(
    superAdminConnection,
    {
      body: { banned: true } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(bannedResult);
  // Verify all returned admins have banned=true
  TestValidator.predicate(
    "all admins have banned=true",
    bannedResult.data.every((admin) => admin.banned === true),
  );
  // 7. Test combined filter: grade='regular' AND banned=false
  const combinedResult =
    await api.functional.discussionBoard.admin.admins.index(
      superAdminConnection,
      {
        body: {
          grade: "regular",
          banned: false,
        } satisfies IDiscussionBoardAdmin.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Verify all returned admins match both criteria
  TestValidator.predicate(
    "all admins have grade='regular' AND banned=false",
    combinedResult.data.every(
      (admin) => admin.grade === "regular" && admin.banned === false,
    ),
  );
  // Verify created regular admins are in the combined result
  const foundInCombined = combinedResult.data.filter((admin) =>
    regularIds.includes(admin.id),
  );
  TestValidator.predicate(
    "created regular admins found in combined result",
    foundInCombined.length === regularAdmins.length,
  );
}
