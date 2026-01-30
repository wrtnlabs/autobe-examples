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
export async function test_api_password_reset_request_by_registered_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new user account via user join endpoint
  const userConnection: api.IConnection = { host: connection.host };
  const user: IEconomicForumUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
      } satisfies IEconomicForumUser.IJoin,
    },
  );
  typia.assert(user);
  // Step 2: Use the registered email to request password reset
  const resetConnection: api.IConnection = { host: connection.host };
  await api.functional.economicForum.user.auth.users.password.resets.create(
    resetConnection,
    {
      body: {
        email: user.email,
      } satisfies IEconomicForumUserPasswordReset,
    },
  );
  // System returns 204 No Content (void) for successful reset requests
  // The rate limiting and audit event logging cannot be validated through API,
  // as rate limiting enforces email sending limits but doesn't block API calls,
  // and audit events require a separate log query API not provided in the endpoints.
}
