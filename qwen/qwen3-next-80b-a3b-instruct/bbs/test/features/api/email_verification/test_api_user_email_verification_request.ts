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
import { prepare_random_economic_forum_user_email_verification } from "../../../prepare/prepare_random_economic_forum_user_email_verification";
import { generate_random_economic_forum_user_auth_users_email_verifications_create } from "../../../generate/generate_random_economic_forum_user_auth_users_email_verifications_create";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_email_verification_request(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate user with join operation to get authentication token
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser: IEconomicForumUser.IAuthorized =
    await authorize_user_join(userConnection, {});
  // Step 2: Use the authenticated connection to request email verification
  const response: IEconomicForumUserEmailVerification =
    await api.functional.economicForum.user.auth.users.email.verifications.create(
      userConnection,
      {
        body: {} satisfies IEconomicForumUserEmailVerification.ICreate,
      },
    );
  // Step 3: Validate response contains exact success message
  TestValidator.equals(
    "email verification response message",
    response.value,
    "Email verification token request initiated successfully.",
  );
  // Step 4: Verify no sensitive data is exposed in response
  // The response should only contain the message value as defined in IEconomicForumUserEmailVerification
  // No other properties should exist
  typia.assert(response);
}
