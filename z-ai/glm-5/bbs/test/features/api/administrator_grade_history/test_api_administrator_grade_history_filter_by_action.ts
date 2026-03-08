import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorGradeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorGradeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorGradeHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_administrator_grade_history_filter_by_action(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator
  // Note: New admins start as 'regular' by default. For this test to work,
  // the test database must have an existing super admin or test setup must
  // promote the first admin. We create an admin that will be used as the actor.
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(superAdminAuth);
  // 2. Create regular administrators to be promoted
  const regularAdmin1Connection: api.IConnection = { host: connection.host };
  const regularAdmin1Auth = await authorize_admin_join(
    regularAdmin1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(regularAdmin1Auth);
  const regularAdmin2Connection: api.IConnection = { host: connection.host };
  const regularAdmin2Auth = await authorize_admin_join(
    regularAdmin2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(regularAdmin2Auth);
  // 3. Promote regular admins to create promotion history records
  // This requires super admin privileges on superAdminConnection
  const promotedAdmin1 =
    await api.functional.discussionBoard.admin.admins.promote(
      superAdminConnection,
      {
        adminId: regularAdmin1Auth.id,
        body: {
          reason: "Test promotion for filtering test",
        } satisfies IDiscussionBoardAdmin.IPromote,
      },
    );
  typia.assert(promotedAdmin1);
  TestValidator.equals(
    "promoted admin has super grade",
    promotedAdmin1.grade,
    "super",
  );
  const promotedAdmin2 =
    await api.functional.discussionBoard.admin.admins.promote(
      superAdminConnection,
      {
        adminId: regularAdmin2Auth.id,
        body: {
          reason: "Second test promotion for filtering test",
        } satisfies IDiscussionBoardAdmin.IPromote,
      },
    );
  typia.assert(promotedAdmin2);
  TestValidator.equals(
    "promoted admin has super grade",
    promotedAdmin2.grade,
    "super",
  );
  // 4. Test filtering by action='promotion'
  const promotionHistory =
    await api.functional.discussionBoard.admin.administrator_grade_histories.index(
      superAdminConnection,
      {
        body: {
          action: "promotion",
          limit: 100,
        } satisfies IDiscussionBoardAdministratorGradeHistory.IRequest,
      },
    );
  typia.assert(promotionHistory);
  // 5. Verify all returned records have action='promotion' and correct grade transitions
  for (const record of promotionHistory.data) {
    TestValidator.equals(
      "action should be promotion",
      record.action,
      "promotion",
    );
    TestValidator.equals(
      "previous_grade should be regular",
      record.previous_grade,
      "regular",
    );
    TestValidator.equals(
      "new_grade should be super",
      record.new_grade,
      "super",
    );
  }
  // 6. Verify at least our promotions are in the filtered results
  TestValidator.predicate(
    "promotion history should have at least 2 records",
    promotionHistory.data.length >= 2,
  );
  // 7. Test without action filter to get all records
  const allHistory =
    await api.functional.discussionBoard.admin.administrator_grade_histories.index(
      superAdminConnection,
      {
        body: {
          limit: 100,
        } satisfies IDiscussionBoardAdministratorGradeHistory.IRequest,
      },
    );
  typia.assert(allHistory);
  // 8. Verify pagination metadata is accurate
  TestValidator.predicate(
    "total records should be at least equal to filtered promotion records",
    allHistory.pagination.records >= promotionHistory.pagination.records,
  );
}
