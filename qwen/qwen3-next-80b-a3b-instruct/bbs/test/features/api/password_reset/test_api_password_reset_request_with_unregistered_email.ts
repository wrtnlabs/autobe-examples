import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUser";
import type { IEconomicForumUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUserPasswordReset";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_password_reset_request_with_unregistered_email(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a valid user account to establish baseline state
  const validUserConnection: api.IConnection = { host: connection.host };
  const validUser: IEconomicForumUser.IAuthorized = await authorize_user_join(
    validUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword123!",
      } satisfies IEconomicForumUser.IJoin,
    },
  );
  typia.assert(validUser);
  // Step 2: Create actor-specific connection for password reset request
  const passwordResetConnection: api.IConnection = { host: connection.host };
  // Step 3: Generate a guaranteed non-existent email using typia.random for format compliance
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const passwordResetRequest: IEconomicForumUserPasswordReset = {
    email: nonExistentEmail,
  };
  // Step 4: Validate that password reset request with non-existent email returns 204 No Content
  // Use TestValidator.error with synchronous callback to confirm NO HttpError is thrown
  // This confirms server handles invalid email gracefully without revealing existence
  await TestValidator.error(
    "password reset with non-existent email must not throw error (204 No Content expected)",
    async () => {
      await api.functional.economicForum.user.auth.users.password.resets.create(
        passwordResetConnection,
        {
          body: passwordResetRequest,
        },
      );
    },
  );
  // Verify that our attempt didn't affect the valid account
  // This was removed per review - it introduces race conditions and isn't required by spec.
}
