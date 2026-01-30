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
export async function test_api_user_email_verification_token_purge(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new user account to trigger generation of email verification token (server-side)
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    },
  });
  // Step 2: Attempt to delete a non-existent email verification token
  // The API should return an error (404 Not Found) for invalid token
  const nonExistentToken: string = typia.random<string & tags.Format<"uuid">>();
  // Validate that deleting an invalid token returns a 404 HTTP error
  await TestValidator.httpError(
    "deleting non-existent email verification token should return 404",
    404,
    async () => {
      await api.functional.economicForum.user.auth.users.email.verifications.erase(
        userConnection,
        {
          token: nonExistentToken,
        },
      );
    },
  );
}
