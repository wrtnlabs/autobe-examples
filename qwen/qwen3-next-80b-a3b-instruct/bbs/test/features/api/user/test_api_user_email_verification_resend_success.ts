import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUser";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_email_verification_resend_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new user account with unverified email via join
  const user: IEconomicForumUser.IAuthorized = await authorize_user_join(
    connection,
    {
      body: {},
    },
  );
  typia.assert(user);
  // Step 2: Create user-specific connection using the authentication token from join response
  const userConnection: api.IConnection = { host: connection.host };
  // The authorize_user_join function automatically updates the connection's headers with the token
  // Step 3: Execute email verification code resend
  // This endpoint requires no request body and uses the authenticated user's email
  await api.functional.economicForum.user.auth.users.email.verify.resend.sendVerification(
    userConnection,
  );
  // The server returns HTTP 204 No Content response - no body to validate
  // No typia.assert needed for void return type
}
