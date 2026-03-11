import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test administrator session list retrieval with default pagination.
 *
 * This test validates the session monitoring endpoint by:
 * 1. Creating member and admin accounts with active sessions
 * 2. Authenticating as administrator
 * 3. Retrieving session list without filters (default pagination)
 * 4. Verifying pagination metadata structure
 * 5. Validating session summary fields
 * 6. Confirming default sorting by created_at DESC
 */
export async function test_api_admin_session_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (generates member session)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberJoin);
  // 2. Create admin account (generates admin session)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // 3. Retrieve session list with default pagination (no filters)
  const response = await api.functional.discussionBoard.member.sessions.index(
    adminConnection,
    {
      body: {} satisfies IDiscussionBoardAdminSession.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current page >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 1",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // 5. Validate session data if sessions exist
  if (response.data.length > 0) {
    const firstSession = response.data[0];
    // Validate all required fields exist
    TestValidator.predicate("session has id", firstSession.id !== undefined);
    TestValidator.predicate(
      "session has userType",
      firstSession.userType !== undefined,
    );
    TestValidator.predicate(
      "session has displayName",
      firstSession.displayName !== undefined,
    );
    TestValidator.predicate(
      "session has ipAddress",
      firstSession.ipAddress !== undefined,
    );
    TestValidator.predicate(
      "session has createdAt",
      firstSession.createdAt !== undefined,
    );
    TestValidator.predicate(
      "session has expiredAt",
      firstSession.expiredAt !== undefined,
    );
    TestValidator.predicate(
      "session has status",
      firstSession.status !== undefined,
    );
    // Validate userType is one of expected values
    TestValidator.predicate(
      "userType is member/admin/guest",
      ["member", "admin", "guest"].includes(firstSession.userType),
    );
    // Validate status is one of expected values
    TestValidator.predicate(
      "status is active/expired",
      ["active", "expired"].includes(firstSession.status),
    );
    // Validate sessions are sorted by createdAt DESC (newest first)
    if (response.data.length > 1) {
      const secondSession = response.data[1];
      const firstDate = new Date(firstSession.createdAt).getTime();
      const secondDate = new Date(secondSession.createdAt).getTime();
      TestValidator.predicate(
        "sessions sorted by createdAt DESC",
        firstDate >= secondDate,
      );
    }
  }
}
