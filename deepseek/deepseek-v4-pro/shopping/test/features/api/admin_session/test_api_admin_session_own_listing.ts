import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that a regular administrator can list their own session history.
 *
 * Validates the complete session listing workflow including registration-based session creation, login-based session creation, and authenticated session retrieval. Ensures that regular administrators can successfully access their own session records and that the returned data maintains proper structure and ordering.
 *
 * The test creates two sessions — one via administrator registration (auto-creates a session) and another via explicit login — then retrieves the session list using the administrator's own ID. Validation covers pagination metadata correctness, session field completeness, and chronological ordering with newest sessions first.
 *
 * 1. Register a new regular administrator with explicit email and password — creates the first session.
 * 2. Log in as the same administrator with new session context — creates a second session.
 * 3. List own sessions using default pagination parameters.
 * 4. Validate pagination: current page is 1, record count is at least 2.
 * 5. Validate sessions appear in descending order by creation time.
 * 6. Validate each session's admin identity matches the authenticated administrator.
 */
export async function test_api_admin_session_own_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin with explicit credentials — creates initial session
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: { email, password },
  });
  typia.assert(authorized);
  // 2. Login as same admin — creates second session
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(loginResult);
  // 3. List own sessions with default pagination
  const page = await api.functional.shoppingMall.admin.admins.sessions.index(
    adminConnection,
    {
      adminId: authorized.id,
      body: {} satisfies IShoppingMallAdminSession.IRequest,
    },
  );
  typia.assert(page);
  // 4. Validate pagination metadata
  TestValidator.equals("pagination current page", page.pagination.current, 1);
  TestValidator.predicate(
    "at least 2 session records",
    page.pagination.records >= 2,
  );
  TestValidator.predicate("pagination pages >= 1", page.pagination.pages >= 1);
  // 5. Validate sessions in descending order by created_at
  if (page.data.length >= 2) {
    for (let i = 0; i < page.data.length - 1; i++) {
      TestValidator.predicate(
        "sessions descending by created_at",
        new Date(page.data[i].created_at) >=
          new Date(page.data[i + 1].created_at),
      );
    }
  }
  // 6. Validate admin identity in each session
  for (const session of page.data) {
    TestValidator.equals(
      "session admin id matches",
      session.admin.id,
      authorized.id,
    );
    TestValidator.equals(
      "session admin email matches",
      session.admin.email,
      authorized.email,
    );
  }
}
