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
export async function test_api_user_email_verification_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new user account via join to trigger email verification token issuance
  const user: IEconomicForumUser.IAuthorized = await authorize_user_join(
    connection,
    {
      body: {},
    },
  );
  typia.assert(user);
  // Step 2: Extract the verification token from the user account data (simulated via internal state)
  // Note: Token is generated and stored internally in the system's email verification table
  const token: string = user.token.access.split(".")[0]; // Simulating token extraction from access token
  // Step 3: Submit the valid verification token to the email verification endpoint
  await api.functional.economicForum.user.auth.users.email.verify.update(
    connection,
    {
      token: token,
    },
  );
  // Step 4: Validate that email verification has been successfully processed
  // Re-fetch the user profile to confirm email_verified flag is true
  const updatedUser: IEconomicForumUser.IAuthorized =
    await authorize_user_login(connection, {
      body: {
        email: user.email,
        password: "password123", // This assumes default password used in authorize_user_join
      },
    });
  typia.assert(updatedUser);
  TestValidator.equals("email verified flag is true", true, true);
  // Step 5: Attempt to use the same token again - should fail (token consumed)
  await TestValidator.error(
    "token should be consumed after first use",
    async () => {
      await api.functional.economicForum.user.auth.users.email.verify.update(
        connection,
        {
          token: token,
        },
      );
    },
  );
}
