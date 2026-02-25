import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_session_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a session with expired_at in the past
  // We need to manually construct an expired session since we can't set expiration time directly
  const now = new Date();
  const pastTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
  const futureTime = new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString(); // 1 hour from now
  // Create a mock session object matching the expected structure
  const mockSession: IDiscussionBoardSuperAdminSession = {
    id: typia.random<string & tags.Format<"uuid">>(),
    access_token: RandomGenerator.alphaNumeric(64),
    refresh_token: RandomGenerator.alphaNumeric(64),
    ip: `192.168.1.${RandomGenerator.alphaNumeric(1)}`,
    user_agent: "Test Browser/1.0",
    referrer: "https://example.com",
    active: false,
    created_at: pastTime,
    expired_at: pastTime, // Expired 24 hours ago
    updated_at: pastTime,
    superAdmin: {
      id: admin.id,
      email: admin.email,
      created_at: admin.createdAt,
    },
  };
  // 3. Call the endpoint to retrieve the expired session
  const result =
    await api.functional.discussionBoard.superAdmin.super_admin_sessions.at(
      connection,
      {
        sessionId: mockSession.id,
      },
    );
  typia.assert(result);
  // 4. Validate the result
  TestValidator.equals("session is not active", result.active, false);
  TestValidator.predicate(
    "expired_at is in the past",
    new Date(result.expired_at) < now,
  );
  TestValidator.equals(
    "super admin ID matches",
    result.superAdmin.id,
    admin.id,
  );
  TestValidator.equals(
    "super admin email matches",
    result.superAdmin.email,
    admin.email,
  );
}
