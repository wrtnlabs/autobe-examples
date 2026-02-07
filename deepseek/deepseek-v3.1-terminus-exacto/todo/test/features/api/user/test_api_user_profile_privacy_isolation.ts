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
 * Test user profile privacy isolation.
 *
 * Verify that users can only access their own profile information and profiles are properly isolated.
 * Create two separate user accounts via join operations to establish different authentication contexts.
 * Test that each user can only see their own profile data and that profile data is properly isolated.
 */
export async function test_api_user_profile_privacy_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Create first user account
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user1);
  // Create second user account
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user2);
  // Verify user1 can access their own profile
  const user1Profile =
    await api.functional.todoApp.user.profile.at(user1Connection);
  typia.assert(user1Profile);
  TestValidator.equals("user1 profile ID matches", user1Profile.id, user1.id);
  TestValidator.equals(
    "user1 profile email matches",
    user1Profile.email,
    user1.email,
  );
  TestValidator.equals(
    "user1 profile display name matches",
    user1Profile.display_name,
    user1.display_name,
  );
  // Verify user2 can access their own profile
  const user2Profile =
    await api.functional.todoApp.user.profile.at(user2Connection);
  typia.assert(user2Profile);
  TestValidator.equals("user2 profile ID matches", user2Profile.id, user2.id);
  TestValidator.equals(
    "user2 profile email matches",
    user2Profile.email,
    user2.email,
  );
  TestValidator.equals(
    "user2 profile display name matches",
    user2Profile.display_name,
    user2.display_name,
  );
  // Verify profiles are different and properly isolated
  TestValidator.notEquals(
    "user profiles should have different IDs",
    user1Profile.id,
    user2Profile.id,
  );
  TestValidator.notEquals(
    "user profiles should have different emails",
    user1Profile.email,
    user2Profile.email,
  );
  TestValidator.notEquals(
    "user profiles should have different display names",
    user1Profile.display_name,
    user2Profile.display_name,
  );
  // Verify that profile data is properly scoped to authenticated user
  TestValidator.predicate(
    "user1 profile contains correct user data",
    user1Profile.id === user1.id &&
      user1Profile.email === user1.email &&
      user1Profile.display_name === user1.display_name,
  );
  TestValidator.predicate(
    "user2 profile contains correct user data",
    user2Profile.id === user2.id &&
      user2Profile.email === user2.email &&
      user2Profile.display_name === user2.display_name,
  );
}
