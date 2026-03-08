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

export async function test_api_administrator_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seed super admin (assumes seed super admin exists in test environment)
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(superAdminConnection, {
    body: {
      email: "admin@test.com",
      password: "password",
      href: "http://localhost/",
      referrer: "http://localhost/",
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 2. Create a regular admin account
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminAuth = await authorize_admin_join(
    regularAdminConnection,
    {},
  );
  typia.assert(regularAdminAuth);
  // 3. Promote the regular admin to super grade
  const promotedAdmin =
    await api.functional.discussionBoard.admin.admins.promote(
      superAdminConnection,
      {
        adminId: regularAdminAuth.id,
        body: {
          reason: "Promotion for list retrieval test",
        } satisfies IDiscussionBoardAdmin.IPromote,
      },
    );
  typia.assert(promotedAdmin);
  // 4. Call the list endpoint with default pagination parameters
  const adminList = await api.functional.discussionBoard.admin.admins.index(
    regularAdminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(adminList);
  // 5. Validate pagination metadata
  TestValidator.equals("current page", adminList.pagination.current, 1);
  TestValidator.predicate("limit is positive", adminList.pagination.limit > 0);
  TestValidator.predicate(
    "records is non-negative",
    adminList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    adminList.pagination.pages >= 0,
  );
  // 6. Validate data array contains expected admin summaries
  TestValidator.predicate("data array exists", adminList.data.length >= 0);
  if (adminList.data.length > 0) {
    TestValidator.predicate(
      "all admins have valid grade",
      adminList.data.every(
        (admin) => admin.grade === "regular" || admin.grade === "super",
      ),
    );
    TestValidator.predicate(
      "all admins have valid banned status",
      adminList.data.every((admin) => typeof admin.banned === "boolean"),
    );
  }
  // 7. Verify at least the created admins exist in the list
  TestValidator.predicate(
    "promoted admin exists in list",
    adminList.data.some((admin) => admin.id === regularAdminAuth.id),
  );
}