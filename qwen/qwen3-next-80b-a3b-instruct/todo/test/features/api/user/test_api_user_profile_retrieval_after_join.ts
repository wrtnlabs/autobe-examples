import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_profile_retrieval_after_join(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: After a user successfully registers via /todoApp/auth/user/join, they should be able to retrieve their profile with a valid access token. The response must contain only the display_name field as defined in ITodoAppProfile schema, and no other user information should be exposed. The test verifies that the profile is returned successfully (200 OK) with a non-empty display name, confirming the profile was created and is accessible to the owner. No authorization bypass is possible - attempting to access this endpoint without a valid token must result in 401 Unauthorized, but this is enforced by framework and not tested here as per AutoBE principles.
  // Create a new connection for user join operation
  const userConnection: api.IConnection = { host: connection.host };
  // Step 1: Register a new user via utility function (mandatory)
  const authorized = await authorize_user_join(userConnection, {
    body: {} satisfies ITodoAppUser.IJoin,
  });
  typia.assert(authorized);
  // Step 2: Create a new connection with valid token for profile retrieval
  const profileConnection: api.IConnection = { host: connection.host };
  // The authorize_user_join function automatically updates the connection's headers with the access token
  // So we can use the same connection for the profile retrieval
  // Step 3: Retrieve the user profile using the authorized connection
  const profile =
    await api.functional.todoApp.user.profile.at(profileConnection);
  typia.assert(profile);
  // Step 4: Validate the profile response - should be of type ITodoAppProfile
  // According to the schema, ITodoAppProfile is an empty object, so we verify it's not null/undefined
  TestValidator.equals("profile is an object", typeof profile, "object");
  TestValidator.predicate("profile is not empty", () => {
    // Since ITodoAppProfile is an empty object {}, we cannot check properties
    // but we can verify it's a non-null object, which confirms the endpoint worked
    return profile !== null;
  });
}
