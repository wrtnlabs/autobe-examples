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
 * Test user profile privacy enforcement by attempting to access another user's profile.
 *
 * This test validates that users can only access their own profile information and
 * cannot retrieve profiles of other users, ensuring complete data isolation between
 * user accounts in the multi-user Todo application.
 */
export async function test_api_user_profile_privacy_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Create User A account
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userA);
  // Create User B account
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userB);
  // User A can successfully access their own profile
  const userAProfile = await api.functional.todoApp.users.at(userAConnection, {
    userId: userA.id,
  });
  typia.assert(userAProfile);
  // User B can successfully access their own profile
  const userBProfile = await api.functional.todoApp.users.at(userBConnection, {
    userId: userB.id,
  });
  typia.assert(userBProfile);
  // Verify User A's profile matches their own data
  TestValidator.equals(
    "User A profile email matches",
    userAProfile.email,
    userA.email,
  );
  TestValidator.equals(
    "User A profile display name matches",
    userAProfile.display_name,
    userA.display_name,
  );
  // Verify User B's profile matches their own data
  TestValidator.equals(
    "User B profile email matches",
    userBProfile.email,
    userB.email,
  );
  TestValidator.equals(
    "User B profile display name matches",
    userBProfile.display_name,
    userB.display_name,
  );
  // Verify profiles are different between users
  TestValidator.notEquals(
    "User A and User B have different IDs",
    userAProfile.id,
    userBProfile.id,
  );
  TestValidator.notEquals(
    "User A and User B have different emails",
    userAProfile.email,
    userBProfile.email,
  );
}
