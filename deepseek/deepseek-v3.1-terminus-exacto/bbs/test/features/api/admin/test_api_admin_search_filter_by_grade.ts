import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test filtering administrator accounts by admin grade (regular vs super).
 */
export async function test_api_admin_search_filter_by_grade(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create regular administrator account
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  // 3. Search for regular administrators only
  const regularSearch = await api.functional.discussionBoard.admins.index(
    connection,
    {
      body: {
        admin_grade: "regular" as const,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(regularSearch);
  // Validate all returned administrators are regular
  for (const admin of regularSearch.data) {
    TestValidator.equals(
      `admin grade regular for ${admin.email}`,
      admin.admin_grade,
      "regular",
    );
  }
  // Verify pagination consistency
  TestValidator.predicate(
    "regular admins total records matches result count",
    regularSearch.pagination.records === regularSearch.data.length,
  );
  // 4. Search for super administrators only
  const superSearch = await api.functional.discussionBoard.admins.index(
    connection,
    {
      body: {
        admin_grade: "super" as const,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(superSearch);
  // Validate all returned administrators are super
  for (const admin of superSearch.data) {
    TestValidator.equals(
      `admin grade super for ${admin.email}`,
      admin.admin_grade,
      "super",
    );
  }
  // Verify pagination consistency
  TestValidator.predicate(
    "super admins total records matches result count",
    superSearch.pagination.records === superSearch.data.length,
  );
  // 5. Test edge case: no administrators for a specific grade (create unique search)
  const noMatchSearch = await api.functional.discussionBoard.admins.index(
    connection,
    {
      body: {
        admin_grade: "regular" as const,
        search: "nonexistentprefix123xyz",
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(noMatchSearch);
  TestValidator.equals(
    "search with non-matching prefix returns empty results",
    noMatchSearch.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records should be zero for no matches",
    noMatchSearch.pagination.records,
    0,
  );
}
