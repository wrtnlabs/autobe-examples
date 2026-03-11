import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorAssignmentToMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignmentToMember";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorAssignmentToMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorAssignmentToMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_administrator_assignments_to_members_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Future date range (no assignments could exist)
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString(); // 1 year in future
  const response1 =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_members.index(
      superAdminConnection,
      {
        body: {
          start_date: futureDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorAssignmentToMember.IRequest,
      },
    );
  typia.assert(response1);
  TestValidator.equals(
    "empty data array for future date range",
    response1.data,
    [],
  );
  TestValidator.equals(
    "zero records for future date range",
    response1.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for future date range",
    response1.pagination.pages,
    0,
  );
  // Test 2: Very specific date range with no likely assignments
  const distantPastDate = new Date("1900-01-01T00:00:00.000Z").toISOString();
  const distantFutureDate = new Date("2100-01-01T00:00:00.000Z").toISOString();
  const response2 =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_members.index(
      superAdminConnection,
      {
        body: {
          start_date: distantPastDate,
          end_date: distantFutureDate,
          assignment_type: "promotion",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorAssignmentToMember.IRequest,
      },
    );
  typia.assert(response2);
  TestValidator.equals(
    "empty data array for specific date range",
    response2.data,
    [],
  );
  TestValidator.equals(
    "zero records for specific date range",
    response2.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for specific date range",
    response2.pagination.pages,
    0,
  );
  // Test 3: Combination of filters that likely return no results
  const response3 =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_members.index(
      superAdminConnection,
      {
        body: {
          assignment_type: "system",
          old_role: "super_admin",
          new_role: "admin",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorAssignmentToMember.IRequest,
      },
    );
  typia.assert(response3);
  TestValidator.equals(
    "empty data array for specific role combination",
    response3.data,
    [],
  );
  TestValidator.equals(
    "zero records for specific role combination",
    response3.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for specific role combination",
    response3.pagination.pages,
    0,
  );
}
