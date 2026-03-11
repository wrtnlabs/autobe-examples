import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignment";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorAssignment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_administrator_assignment_to_admins_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Search for contradictory role transition (admin to member)
  const search1 =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_admins.index(
      superAdminConnection,
      {
        body: {
          old_role: "admin",
          new_role: "member",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(search1);
  TestValidator.equals(
    "records should be 0 for contradictory role transition",
    search1.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages should be 0 for contradictory role transition",
    search1.pagination.pages,
    0,
  );
  TestValidator.equals(
    "data array should be empty for contradictory role transition",
    search1.data.length,
    0,
  );
  // Test 2: Search for specific text that doesn't exist
  const search2 =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_admins.index(
      superAdminConnection,
      {
        body: {
          search: "nonexistent_unique_text_12345",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(search2);
  TestValidator.equals(
    "records should be 0 for nonexistent text",
    search2.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages should be 0 for nonexistent text",
    search2.pagination.pages,
    0,
  );
  TestValidator.equals(
    "data array should be empty for nonexistent text",
    search2.data.length,
    0,
  );
  // Test 3: Search with date range in the future
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString(); // 1 year in future
  const search3 =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_admins.index(
      superAdminConnection,
      {
        body: {
          created_at_start: futureDate satisfies string &
            tags.Format<"date-time">,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(search3);
  TestValidator.equals(
    "records should be 0 for future date range",
    search3.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages should be 0 for future date range",
    search3.pagination.pages,
    0,
  );
  TestValidator.equals(
    "data array should be empty for future date range",
    search3.data.length,
    0,
  );
  // Test 4: Search with assignment type that doesn't exist
  const search4 =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_admins.index(
      superAdminConnection,
      {
        body: {
          assignment_type: "nonexistent_type",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(search4);
  TestValidator.equals(
    "records should be 0 for nonexistent assignment type",
    search4.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages should be 0 for nonexistent assignment type",
    search4.pagination.pages,
    0,
  );
  TestValidator.equals(
    "data array should be empty for nonexistent assignment type",
    search4.data.length,
    0,
  );
  // Test 5: Search with combination of filters that guarantee no results
  const search5 =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_admins.index(
      superAdminConnection,
      {
        body: {
          old_role: "super_admin",
          new_role: "member",
          assignment_type: "promotion",
          search: "impossible_combination_67890",
          created_at_start: futureDate satisfies string &
            tags.Format<"date-time">,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(search5);
  TestValidator.equals(
    "records should be 0 for impossible combination",
    search5.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages should be 0 for impossible combination",
    search5.pagination.pages,
    0,
  );
  TestValidator.equals(
    "data array should be empty for impossible combination",
    search5.data.length,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    search5.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    search5.pagination.limit,
    5,
  );
}
