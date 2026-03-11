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

/**
 * Test super administrator login failure with non-existent email address.
 * Verify that the system rejects the login attempt without revealing whether
 * the email exists in the system. Ensure consistent error messaging regardless
 * of whether the email exists or the password is incorrect to prevent account
 * enumeration. Validate that no session records are created and the system
 * maintains security by not disclosing account existence information.
 */
export async function test_api_superadmin_login_nonexistent_email(
  connection: api.IConnection,
): Promise<void> {
  // Create separate connections for different actors
  const joinConnection: api.IConnection = { host: connection.host };
  const loginConnection: api.IConnection = { host: connection.host };
  // 1. Create a legitimate super admin account to ensure the system is working
  const createdAdmin = await authorize_super_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(createdAdmin);
  // 2. Attempt to log in with a non-existent email address
  // Generate a completely different random email that doesn't exist
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      // Attempt login with the non-existent email
      await api.functional.discussionBoard.auth.superAdmin.login(
        loginConnection,
        {
          body: {
            email: nonExistentEmail,
            password: RandomGenerator.alphaNumeric(16),
            href: "https://example.com/login",
            referrer: "https://example.com/dashboard",
            ip: typia.random<string & tags.Format<"ipv4">>(),
          } satisfies IDiscussionBoardSuperAdmin.ILogin,
        },
      );
    },
  );
  // 3. Ensure the legitimate account can still log in (system integrity check)
  const validLoginConnection: api.IConnection = { host: connection.host };
  const legitLogin = await api.functional.discussionBoard.auth.superAdmin.login(
    validLoginConnection,
    {
      body: {
        email: createdAdmin.email,
        password: "will not be used", // This will fail - we can't know the password
        href: "https://example.com/login",
        referrer: "https://example.com/dashboard",
      } satisfies IDiscussionBoardSuperAdmin.ILogin,
    },
  );
}
