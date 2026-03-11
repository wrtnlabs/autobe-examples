import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodoSortingPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoSortingPreference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that sorting preferences are properly isolated to authenticated members only.
 * Validates authorization boundary by ensuring sorting preferences cannot be accessed
 * without proper authentication. Tests unauthorized access error (401) and data
 * isolation between member accounts.
 */
export async function test_api_member_sorting_preferences_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Attempt unauthorized access → should throw error
  await TestValidator.error("unauthorized access", async () => {
    // Create unauthenticated connection
    const unauthConnection: api.IConnection = { host: connection.host };
    await api.functional.multiUserTodo.member.sorting_preferences.at(
      unauthConnection,
    );
  });
  // Test 2: Create member A and test proper access
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberA);
  const memberAPrefs =
    await api.functional.multiUserTodo.member.sorting_preferences.at(
      memberAConnection,
    );
  typia.assert(memberAPrefs);
  // Validate member A owns their preferences
  TestValidator.equals(
    "member A preferences belong to member A",
    memberAPrefs.member.id,
    memberA.id,
  );
  // Test 3: Create member B and test data isolation
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberB);
  const memberBPrefs =
    await api.functional.multiUserTodo.member.sorting_preferences.at(
      memberBConnection,
    );
  typia.assert(memberBPrefs);
  // Validate member B owns their preferences
  TestValidator.equals(
    "member B preferences belong to member B",
    memberBPrefs.member.id,
    memberB.id,
  );
  // Test 4: Verify data isolation - member A's prefs don't reference member B
  TestValidator.notEquals(
    "member A preferences don't reference member B",
    memberAPrefs.member.id,
    memberB.id,
  );
  TestValidator.notEquals(
    "member B preferences don't reference member A",
    memberBPrefs.member.id,
    memberA.id,
  );
  // Validate sorting preference structure
  TestValidator.predicate(
    "sorting method is valid",
    ["creation_date", "start_date", "due_date"].includes(
      memberAPrefs.sorting_method,
    ),
  );
  TestValidator.predicate(
    "sorting direction is boolean",
    typeof memberAPrefs.sorting_direction === "boolean",
  );
}
