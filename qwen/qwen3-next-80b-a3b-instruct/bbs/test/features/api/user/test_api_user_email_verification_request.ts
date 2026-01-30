import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUser";
import type { IEconomicForumUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUserEmailVerification";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_email_verification_request(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate user via join
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser: IEconomicForumUser.IAuthorized =
    await authorize_user_join(userConnection, {
      body: {},
    });
  // userConnection.headers is now updated internally by authorize function with token
  // Step 2: Use the authenticated user connection to request email verification
  const verificationResponse: IEconomicForumUserEmailVerification =
    await api.functional.economicForum.user.auth.users.email.verify.request(
      userConnection,
    );
  typia.assert(verificationResponse);
  // Step 3: Validate the response contains the exact success message as defined in the schema
  TestValidator.equals(
    "verification response contains correct success message",
    verificationResponse.value,
    "Email verification token request initiated successfully.",
  );
}
