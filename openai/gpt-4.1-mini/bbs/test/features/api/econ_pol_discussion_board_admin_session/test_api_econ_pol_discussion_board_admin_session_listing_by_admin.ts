import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdmin";
import type { IEconPolDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdminSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPolDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPolDiscussionBoardAdminSession";

export async function test_api_econ_pol_discussion_board_admin_session_listing_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate admin using join operation
  const adminJoinBody = {
    username: `admin${RandomGenerator.alphaNumeric(5)}`,
    email: `${RandomGenerator.alphabets(10)}@example.com`,
    password: "AdminPassword123!",
  } satisfies IEconPolDiscussionBoardAdmin.IJoin;
  const adminJoined: IEconPolDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminJoined);

  // 2. Create an administrator account prerequisite
  const adminCreateBody = {
    adminUsername: adminJoined.adminUsername,
    email: adminJoined.email,
    password: "AdminPassword123!",
    role: "admin",
  } satisfies IEconPolDiscussionBoardAdmin.ICreate;

  const createdAdmin: IEconPolDiscussionBoardAdmin =
    await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardAdmins.create(
      connection,
      { body: adminCreateBody },
    );
  typia.assert(createdAdmin);

  // 3. Request a paginated list of admin login sessions
  const requestBody = {
    page: 1,
    limit: 10,
    sort_by: "created_at",
    order: "desc",
    ip_address: null,
    date_from: null,
    date_to: null,
  } satisfies IEconPolDiscussionBoardAdminSession.IRequest;

  const sessionsPage: IPageIEconPolDiscussionBoardAdminSession.ISummary =
    await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardAdmins.sessions.index(
      connection,
      {
        adminUsername: adminJoined.adminUsername,
        body: requestBody,
      },
    );
  typia.assert(sessionsPage);

  // 4. Validate session page pagination and data structure
  TestValidator.equals(
    "pagination current page matches request",
    sessionsPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    sessionsPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "sessions data is an array",
    Array.isArray(sessionsPage.data),
  );
  for (const session of sessionsPage.data) {
    typia.assert(session);
    TestValidator.predicate(
      "session has uuid id",
      typeof session.id === "string" && session.id.length > 0,
    );
    TestValidator.predicate(
      "session admin id is non-empty string",
      typeof session.econ_pol_discussion_board_admin_id === "string" &&
        session.econ_pol_discussion_board_admin_id.length > 0,
    );
    TestValidator.predicate(
      "session ip is non-empty string",
      typeof session.ip === "string" && session.ip.length > 0,
    );
    TestValidator.predicate(
      "session href is a string",
      typeof session.href === "string",
    );
    TestValidator.predicate(
      "session created_at is a valid ISO date string",
      typeof session.created_at === "string" &&
        !isNaN(Date.parse(session.created_at)),
    );
    // expired_at is optional and nullable, if present check ISO string validity
    if (session.expired_at !== null && session.expired_at !== undefined) {
      TestValidator.predicate(
        "session expired_at is a valid ISO date string",
        typeof session.expired_at === "string" &&
          !isNaN(Date.parse(session.expired_at)),
      );
    }
  }
}
