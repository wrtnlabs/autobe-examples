import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import type { IRedditPlatformUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_password_reset_request_nonexistent_user(
  connection: api.IConnection,
): Promise<void> {
  // Create test connection for password reset request
  const testConnection: api.IConnection = { host: connection.host };
  // Try to request password reset for non-existent user email
  const nonExistentEmail = "nonexistent.user@test.com";
  // Request password reset - this should succeed without revealing user existence
  const result =
    await api.functional.redditPlatform.user.password_resets.requestPasswordReset(
      testConnection,
      {
        body: {
          email: nonExistentEmail,
        } satisfies IRedditPlatformUserPasswordReset,
      },
    );
  typia.assert(result);
  // Verify response format is correct (no user existence leak)
  TestValidator.equals("response format is empty object", result, {});
}
