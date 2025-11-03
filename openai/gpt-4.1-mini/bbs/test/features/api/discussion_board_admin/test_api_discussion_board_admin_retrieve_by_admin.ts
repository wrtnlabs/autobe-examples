import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";

export async function test_api_discussion_board_admin_retrieve_by_admin(
  connection: api.IConnection,
) {
  // 1. Create a new admin account using admin join endpoint
  const joinBody = {
    email: `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@example.com`,
    password: "Password123!",
  } satisfies IDiscussionBoardAdmin.IJoin;

  const authorized: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2. Retrieve admin details by admin ID
  const adminDetail: IDiscussionBoardAdmin =
    await api.functional.discussionBoard.admin.discussionBoardAdmins.at(
      connection,
      { discussionBoardAdminId: authorized.id },
    );
  typia.assert(adminDetail);

  // 3. Validate returned admin data
  TestValidator.equals("admin id matches", adminDetail.id, authorized.id);
  TestValidator.equals(
    "admin email matches",
    adminDetail.email,
    authorized.email,
  );
  TestValidator.equals(
    "admin password hash matches",
    adminDetail.password_hash,
    authorized.password_hash,
  );
  TestValidator.equals(
    "admin created_at matches",
    adminDetail.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "admin updated_at matches",
    adminDetail.updated_at,
    authorized.updated_at,
  );

  // deleted_at is optional and nullable, check consistency
  TestValidator.equals(
    "admin deleted_at is null",
    adminDetail.deleted_at ?? null,
    authorized.deleted_at ?? null,
  );

  // Validate sessions
  TestValidator.predicate(
    "admin sessions is array",
    Array.isArray(adminDetail.discussion_board_admin_sessions),
  );
  for (const session of adminDetail.discussion_board_admin_sessions ?? []) {
    typia.assert(session);
    TestValidator.predicate(
      "session id valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
    TestValidator.equals(
      "session discussion_board_admin_id matches",
      session.discussion_board_admin_id,
      adminDetail.id,
    );
    TestValidator.predicate(
      "session ip is string",
      typeof session.ip === "string",
    );
    TestValidator.predicate(
      "session href is string",
      typeof session.href === "string",
    );
    TestValidator.predicate(
      "session referrer is string",
      typeof session.referrer === "string",
    );
    TestValidator.predicate(
      "session created_at is string",
      typeof session.created_at === "string",
    );
    // expired_at can be null or string
    TestValidator.predicate(
      "session expired_at is string or null",
      session.expired_at === null || typeof session.expired_at === "string",
    );
  }
}
