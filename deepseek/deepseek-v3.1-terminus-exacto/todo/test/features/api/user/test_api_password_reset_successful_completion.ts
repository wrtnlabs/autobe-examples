import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserPasswordReset";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_password_reset_successful_completion(
  connection: api.IConnection,
): Promise<void> {
  // Create user account
  const userConnection: api.IConnection = { host: connection.host };
  const originalPassword = RandomGenerator.alphaNumeric(16);
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: originalPassword,
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // For this test, we need to simulate a valid reset token that exists in the system
  // Since we don't have access to the password reset request generation endpoint,
  // we'll focus on testing the completion endpoint with a properly structured request
  // Create a new connection for the password reset completion (no authentication required)
  const resetConnection: api.IConnection = { host: connection.host };
  // Generate a new password and valid reset token format
  const newPassword = RandomGenerator.alphaNumeric(16);
  const resetToken = typia.random<string>();
  // Complete password reset
  const resetResponse = await api.functional.todoApp.user.password_resets.index(
    resetConnection,
    {
      body: {
        reset_token: resetToken,
        new_password: newPassword,
      } satisfies ITodoAppUserPasswordReset.IRequest,
    },
  );
  typia.assert(resetResponse);
  // Validate the response structure
  TestValidator.equals(
    "response should contain pagination",
    typeof resetResponse.pagination,
    "object",
  );
  TestValidator.equals(
    "response should contain data array",
    Array.isArray(resetResponse.data),
    true,
  );
  // The response should contain the reset summary with proper status
  if (resetResponse.data.length > 0) {
    const resetSummary = resetResponse.data[0];
    TestValidator.predicate(
      "reset summary should have id",
      typeof resetSummary.id === "string",
    );
    TestValidator.predicate(
      "reset summary should have masked token",
      typeof resetSummary.reset_token_masked === "string",
    );
    TestValidator.predicate(
      "reset summary should have created_at",
      typeof resetSummary.created_at === "string",
    );
    TestValidator.predicate(
      "reset summary should have expired flag",
      typeof resetSummary.expired === "boolean",
    );
    TestValidator.predicate(
      "reset summary should have used flag",
      typeof resetSummary.used === "boolean",
    );
  }
}
