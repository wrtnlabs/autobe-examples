import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_login_with_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Test Scenario 1: Non-existent email
  {
    const loginConnection: api.IConnection = { host: connection.host };
    await TestValidator.error("non-existent email returns 401", async () => {
      await api.functional.discussionBoard.auth.superAdmin.login(
        loginConnection,
        {
          body: {
            email: "nonexistent@example.com",
            password: "wrongpassword123",
          } satisfies IDiscussionBoardSuperAdmin.ILogin,
        },
      );
    });
  }
  // Test Scenario 2: Incorrect password with valid super admin
  {
    // Create a valid super admin first
    const joinConnection: api.IConnection = { host: connection.host };
    const superAdmin =
      await api.functional.discussionBoard.auth.superAdmin.join(
        joinConnection,
        {
          body: {
            email: `test_${RandomGenerator.alphaNumeric(8)}@example.com`,
            password: "SecurePass123!",
            display_name: "Test Super Admin",
            bio: "Test administrator for E2E validation",
            href: "https://example.com/dashboard",
            referrer: "https://example.com/login",
          } satisfies IDiscussionBoardSuperAdmin.IJoin,
        },
      );
    typia.assert(superAdmin);
    // Test login with correct email but wrong password
    const wrongPasswordConnection: api.IConnection = {
      host: connection.host,
    };
    await TestValidator.error("incorrect password returns 401", async () => {
      await api.functional.discussionBoard.auth.superAdmin.login(
        wrongPasswordConnection,
        {
          body: {
            email: superAdmin.email,
            password: "WrongPassword123!",
          } satisfies IDiscussionBoardSuperAdmin.ILogin,
        },
      );
    });
    // Verify no session was created on failed login
    TestValidator.equals(
      "no authorization header on failure",
      wrongPasswordConnection.headers?.Authorization,
      undefined,
    );
  }
}
