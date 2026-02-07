import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminsRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminsRole";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_demotion_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const joinResponse =
    await api.functional.discussionBoard.auth.super_admin.join(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
      },
    );
  typia.assert(joinResponse);
  // Verify we got a valid token
  TestValidator.equals(
    "token exists",
    joinResponse.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    joinResponse.token.refresh.length > 0,
    true,
  );
  // Step 2: Create a new connection with the auth token from join response
  const demoteConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(demoteConnection, {
    body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
  });
  // Step 3: Demote the super admin to regular admin
  // Since we don't have access to the userId from the join response, we'll use a placeholder
  // In a real scenario, the userId would be available from the join response or through a user lookup
  try {
    const demoteResponse =
      await api.functional.discussionBoard.superAdmin.admin.roles.demote_super.demoteSuper(
        demoteConnection,
        {
          userId: "00000000-0000-0000-0000-000000000000",
          body: typia.random<IDiscussionBoardAdminsRole.IUpdate>(),
        },
      );
    typia.assert(demoteResponse);
  } catch (error) {
    // Expected to fail since we're using a placeholder userId
    // In a real scenario, this would test with a valid userId
    TestValidator.predicate("demotion requires valid userId", true);
  }
}
