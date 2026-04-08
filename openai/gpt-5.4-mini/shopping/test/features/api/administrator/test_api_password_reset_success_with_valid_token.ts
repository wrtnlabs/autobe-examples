import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_password_reset_success_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies successful administrator password reset submission with a valid recovery payload.
   *
   * This test provisions an administrator account context, submits a password reset update
   * request using the provided DTO shape, and confirms the operation completes successfully
   * as a void endpoint without throwing.
   *
   * 1. Create an administrator account to establish a valid authenticated context.
   * 2. Submit a password reset update request with the current and new passwords.
   * 3. Confirm the update call succeeds and returns no content.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const currentPassword = "OldPassword1234!";
  const newPassword = "NewPassword1234!";
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email,
        password: currentPassword,
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  const output =
    await api.functional.mallPlatform.administrator.password_resets.update(
      administratorConnection,
      {
        body: {
          currentPassword,
          newPassword,
        } satisfies IMallPlatformCustomerPasswordReset.IUpdate,
      },
    );
  TestValidator.equals("password reset update returns void", output, undefined);
}
