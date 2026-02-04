import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
export async function test_api_owner_login_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an owner account that will be banned
  // Generate the credentials for ownership registration
  const ownerEmail: string = typia.random<string & tags.Format<"email">>();
  const ownerPassword: string = RandomGenerator.alphaNumeric(16);
  // Join as owner with generated credentials
  const registeredOwner: ICommunityPlatformOwner.IAuthorized =
    await authorize_owner_join(connection, {
      body: {
        email: ownerEmail,
        password: ownerPassword,
      } satisfies ICommunityPlatformOwner.IJoin,
    });
  typia.assert(registeredOwner);
  // Step 2: Attempt to log in with the banned owner's credentials
  // The backend should return 401 for banned accounts with generic "Invalid email or password" message
  await TestValidator.error(
    "banned owner login should fail with 401 error",
    async () => {
      await authorize_owner_login(
        connection, // Use the connection passed to the test function
        {
          body: {
            email: ownerEmail, // Use the saved email
            password: ownerPassword, // Use the saved password
          } satisfies ICommunityPlatformOwner.ILogin,
        },
      );
    },
  );
}
