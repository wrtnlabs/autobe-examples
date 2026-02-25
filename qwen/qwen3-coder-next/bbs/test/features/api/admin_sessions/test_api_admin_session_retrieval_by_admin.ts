import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_session_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin user and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Step 2: Test with valid session ID using admin's ID from auth response
  // Based on the scenario, the session ID is likely the admin ID or session record ID
  const sessionRetrieved =
    await api.functional.discussionBoard.admin.admin_sessions.at(
      adminConnection,
      {
        sessionId: adminAuth.id,
      },
    );
  typia.assert(sessionRetrieved);
  // Step 3: Validate session response structure
  TestValidator.predicate(
    "has valid session id",
    sessionRetrieved.id !== undefined,
  );
  TestValidator.predicate(
    "has valid access token",
    sessionRetrieved.access_token !== undefined &&
      sessionRetrieved.access_token.length > 0,
  );
  TestValidator.predicate(
    "has valid created_at timestamp",
    sessionRetrieved.created_at !== undefined,
  );
  TestValidator.predicate(
    "has valid expired_at timestamp",
    sessionRetrieved.expired_at !== undefined,
  );
  TestValidator.predicate(
    "has valid updated_at timestamp",
    sessionRetrieved.updated_at !== undefined,
  );
  TestValidator.predicate(
    "has valid IP address",
    sessionRetrieved.ip !== undefined,
  );
  TestValidator.predicate(
    "has valid href",
    sessionRetrieved.href !== undefined,
  );
  TestValidator.predicate(
    "has admin profile",
    sessionRetrieved.admin !== undefined,
  );
  // Validate admin profile
  if (sessionRetrieved.admin) {
    TestValidator.predicate(
      "admin has valid id",
      sessionRetrieved.admin.id !== undefined,
    );
    TestValidator.predicate(
      "admin has valid display_name",
      sessionRetrieved.admin.display_name !== undefined,
    );
    TestValidator.predicate(
      "admin has valid email",
      sessionRetrieved.admin.email !== undefined,
    );
    TestValidator.predicate(
      "admin has is_super_admin flag",
      sessionRetrieved.admin.is_super_admin !== undefined,
    );
    TestValidator.predicate(
      "admin has is_active flag",
      sessionRetrieved.admin.is_active !== undefined,
    );
    TestValidator.predicate(
      "admin has created_at",
      sessionRetrieved.admin.created_at !== undefined,
    );
    TestValidator.predicate(
      "admin has updated_at",
      sessionRetrieved.admin.updated_at !== undefined,
    );
    TestValidator.predicate(
      "admin has deleted_at",
      sessionRetrieved.admin.deleted_at !== undefined,
    );
  }
  // Step 4: Test invalid session ID (should return 404)
  await TestValidator.httpError(
    "invalid session ID should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.admin.admin_sessions.at(
        adminConnection,
        {
          sessionId: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
        },
      );
    },
  );
  // Step 5: Test access control - create another admin and verify they can't access first admin's session
  const anotherAdminConnection: api.IConnection = { host: connection.host };
  const anotherAdminAuth = await api.functional.discussionBoard.auth.admin.join(
    anotherAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(anotherAdminAuth);
  // Another admin should not be able to access first admin's session
  // Verify the access control is properly implemented
  await TestValidator.httpError(
    "another admin cannot access different session",
    404,
    async () => {
      await api.functional.discussionBoard.admin.admin_sessions.at(
        anotherAdminConnection,
        {
          sessionId: adminAuth.id,
        },
      );
    },
  );
}
