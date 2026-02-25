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

export async function test_api_user_profile_update_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Setup two test users for privacy testing
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user1);
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user2);
  // Test 1: Minimum length boundary (1 character)
  const minLengthBody = {
    display_name: "A",
  } satisfies ITodoAppUser.IUpdate;
  const minLengthResult =
    await api.functional.todoApp.user.users.profile.update(user1Connection, {
      body: minLengthBody,
    });
  typia.assert(minLengthResult);
  TestValidator.equals(
    "min length should be accepted",
    minLengthResult.display_name,
    "A",
  );
  // Test 2: Empty display name (null)
  const nullBody = {
    display_name: null,
  } satisfies ITodoAppUser.IUpdate;
  const nullResult = await api.functional.todoApp.user.users.profile.update(
    user1Connection,
    { body: nullBody },
  );
  typia.assert(nullResult);
  TestValidator.equals(
    "null should preserve current display name",
    nullResult.display_name,
    "A",
  );
  // Test 3: Empty display name (undefined)
  const undefinedBody = {
    display_name: undefined,
  } satisfies ITodoAppUser.IUpdate;
  const undefinedResult =
    await api.functional.todoApp.user.users.profile.update(user1Connection, {
      body: undefinedBody,
    });
  typia.assert(undefinedResult);
  TestValidator.equals(
    "undefined should preserve current display name",
    undefinedResult.display_name,
    "A",
  );
  // Test 4: Maximum length boundary (50 characters - valid)
  const maxValidDisplayName = RandomGenerator.alphabets(50);
  const maxValidBody = {
    display_name: maxValidDisplayName,
  } satisfies ITodoAppUser.IUpdate;
  const maxValidResult = await api.functional.todoApp.user.users.profile.update(
    user1Connection,
    { body: maxValidBody },
  );
  typia.assert(maxValidResult);
  TestValidator.equals(
    "max valid length should be accepted",
    maxValidResult.display_name,
    maxValidDisplayName,
  );
  // Test 5: Beyond maximum length boundary (51 characters - should error)
  const maxInvalidBody = {
    display_name: RandomGenerator.alphabets(51),
  } satisfies ITodoAppUser.IUpdate as any;
  await TestValidator.error("display name too long should error", async () => {
    await api.functional.todoApp.user.users.profile.update(user1Connection, {
      body: maxInvalidBody,
    });
  });
  // Test 6: Special character handling
  const specialCharsBody = {
    display_name: "User123!@#$%^&*()_+-=[]{}|;:,.<>?",
  } satisfies ITodoAppUser.IUpdate;
  const specialCharsResult =
    await api.functional.todoApp.user.users.profile.update(user1Connection, {
      body: specialCharsBody,
    });
  typia.assert(specialCharsResult);
  TestValidator.equals(
    "special characters should be accepted",
    specialCharsResult.display_name,
    "User123!@#$%^&*()_+-=[]{}|;:,.<>?",
  );
  // Test 7: Privacy enforcement - user2 cannot access user1's profile
  await TestValidator.error("user2 cannot update user1's profile", async () => {
    await api.functional.todoApp.user.users.profile.update(user2Connection, {
      body: { display_name: "Attempted Hijack" } satisfies ITodoAppUser.IUpdate,
    });
  });
  // Verify user1's profile remains unchanged after unauthorized attempt
  const finalCheck = await api.functional.todoApp.user.users.profile.update(
    user1Connection,
    { body: {} satisfies ITodoAppUser.IUpdate },
  );
  typia.assert(finalCheck);
  TestValidator.equals(
    "profile should remain unchanged after unauthorized attempt",
    finalCheck.display_name,
    "User123!@#$%^&*()_+-=[]{}|;:,.<>?",
  );
}
