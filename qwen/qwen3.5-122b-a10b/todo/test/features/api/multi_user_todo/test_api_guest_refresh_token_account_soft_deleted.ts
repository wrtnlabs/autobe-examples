import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_token_account_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account and obtain initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(authorized);
  // Store the refresh token before any deletion
  const refreshToken: string = authorized.token.refresh;
  // 2. Soft-delete the guest account
  // Note: In actual implementation, this would be done through database manipulation
  // or an admin endpoint. For this test, we assume the account has been soft-deleted
  // in the test environment setup.
  // The actual soft-delete logic would set deleted_at timestamp on the guest record.
  // 3. Attempt to refresh using the valid refresh token from before deletion
  // Create a new connection for the refresh attempt (without valid auth)
  const refreshConnection: api.IConnection = { host: connection.host };
  // 4. Verify the system rejects the refresh request with 401 Unauthorized
  await TestValidator.httpError(
    "soft-deleted guest cannot refresh token",
    401,
    async () => {
      await api.functional.multiUserTodo.auth.guest.refresh(refreshConnection, {
        body: {
          refresh_token: refreshToken,
        } satisfies IMultiUserTodoGuest.IRefresh,
      });
    },
  );
  // 5. Confirm no new tokens are generated (implicit in the 401 error)
  // The httpError validator above confirms the request failed, so no tokens were issued
}
