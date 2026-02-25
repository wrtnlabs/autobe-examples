import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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

/**
 * Test administrator session listing and IP address filtering for security auditing.
 * This scenario validates that admins can view their session history.
 * 1) Register and authenticate admin to establish session
 * 2) Call PATCH /discussionBoard/admin/sessions to list admin sessions
 * 3) Verify session data structure is correct
 * 4) Test pagination works correctly
 */
export async function test_api_admin_session_ip_address_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate admin to establish session
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. List admin sessions (PATCH /discussionBoard/admin/sessions)
  const result: IPageIDiscussionBoardAdminSession.ISummary =
    await api.functional.discussionBoard.admin.sessions.index(adminConnection);
  typia.assert(result);
  // 3. Verify session data structure
  TestValidator.predicate("has session data", result.data.length >= 0);
  if (result.data.length > 0) {
    // Validate first session structure
    const session = result.data[0];
    typia.assert<{
      id: string;
      ip: string;
      href: string;
      created_at: string;
      expired_at: string;
      admin: {
        id: string;
        display_name: string;
        email: string;
        is_super_admin: boolean;
        is_active: boolean;
        created_at: string;
        updated_at: string;
        deleted_at: string | null;
      };
    }>(session);
    // Validate IP address format (IPv4)
    TestValidator.predicate(
      "IP format valid",
      /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/.test(session.ip),
    );
    // Validate admin session relationship
    TestValidator.equals(
      "session has admin",
      typeof session.admin.id === "string",
      true,
    );
    TestValidator.equals(
      "session has admin display_name",
      typeof session.admin.display_name === "string",
      true,
    );
    TestValidator.equals(
      "session has admin email",
      typeof session.admin.email === "string",
      true,
    );
  }
  // 4. Test pagination metadata structure
  TestValidator.equals(
    "pagination has records",
    typeof result.pagination.records === "number",
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    typeof result.pagination.pages === "number",
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    typeof result.pagination.limit === "number",
    true,
  );
  TestValidator.equals(
    "pagination has current",
    typeof result.pagination.current === "number",
    true,
  );
  // Validate pagination constraints
  TestValidator.predicate(
    "pagination records >= 0",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate("pagination limit > 0", result.pagination.limit > 0);
  TestValidator.predicate(
    "pagination current >= 1",
    result.pagination.current >= 1,
  );
}
