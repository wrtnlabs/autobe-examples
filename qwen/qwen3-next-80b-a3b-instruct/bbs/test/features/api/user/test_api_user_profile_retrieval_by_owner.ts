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
export async function test_api_user_profile_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for user authentication
  const userConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate as new user to create account and obtain access token
  // Using the authorization utility function for user join (POST /economicForum/auth/user/join)
  const authorizedUser: IEconomicForumUser.IAuthorized =
    await authorize_user_join(userConnection, {
      body: {},
    });
  // Step 2: Use the authenticated connection to retrieve the user's own profile
  // Using the SDK function for retrieving user profile (GET /economicForum/user/users/{userId})
  const userProfile: IEconomicForumUser =
    await api.functional.economicForum.user.users.at(userConnection, {
      userId: authorizedUser.id,
    });
  // Validate the response structure matches IEconomicForumUser schema
  typia.assert(userProfile);
  // Validate the user id matches the authenticated user's id
  TestValidator.equals(
    "user id matches authenticated user id",
    userProfile.id,
    authorizedUser.id,
  );
}
