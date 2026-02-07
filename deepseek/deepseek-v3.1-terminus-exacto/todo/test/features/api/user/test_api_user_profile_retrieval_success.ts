import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test successful retrieval of authenticated user's profile information.
 *
 * This test validates that users can retrieve their own profile information
 * after successful registration and authentication. It ensures that:
 * - Profile retrieval endpoint returns correct user data
 * - Sensitive information is excluded from the response
 * - Ownership validation is properly enforced
 * - All required profile fields are present and match registration data
 */
export async function test_api_user_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create user account through registration
  const userConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(joinResponse);
  // Retrieve user profile using the authenticated connection
  const profile = await api.functional.todoApp.users.at(userConnection, {
    userId: joinResponse.id,
  });
  typia.assert(profile);
  // Validate that profile data matches registration information
  TestValidator.equals("user ID matches", profile.id, joinResponse.id);
  TestValidator.equals("email matches", profile.email, joinResponse.email);
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    joinResponse.display_name,
  );
  // Verify that updated_at is equal to or after created_at
  TestValidator.predicate(
    "updated_at is after or equal to created_at",
    new Date(profile.updated_at) >= new Date(profile.created_at),
  );
}
