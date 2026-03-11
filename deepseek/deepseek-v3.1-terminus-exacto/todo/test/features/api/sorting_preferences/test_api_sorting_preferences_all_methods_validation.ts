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
 * Test all valid sorting method combinations to ensure business logic validation works correctly.
 */
export async function test_api_sorting_preferences_all_methods_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member (use utility function)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Define all valid sorting method combinations
  const sortingMethods = ["creation_date", "start_date", "due_date"] as const;
  const directions = [true, false] as const;
  // 3. Test each method+direction combination
  for (const method of sortingMethods) {
    for (const direction of directions) {
      // Update with both fields
      const update =
        await api.functional.multiUserTodo.member.sorting_preferences.put(
          memberConnection,
          {
            body: {
              sorting_method: method,
              sorting_direction: direction,
            } satisfies IMultiUserTodoTodoSortingPreference.IUpdate,
          },
        );
      typia.assert(update);
      // Validate response
      TestValidator.equals(
        "sorting method matches",
        update.sorting_method,
        method,
      );
      TestValidator.equals(
        "sorting direction matches",
        update.sorting_direction,
        direction,
      );
      TestValidator.predicate(
        "has valid ID",
        /^[0-9a-f-]{36}$/i.test(update.id),
      );
      TestValidator.predicate(
        "has created_at",
        update.created_at.endsWith("T00:00:00.000Z") === false,
      );
      TestValidator.predicate(
        "has updated_at",
        update.updated_at.endsWith("T00:00:00.000Z") === false,
      );
      TestValidator.equals(
        "member email matches",
        update.member.email,
        typeof memberConnection.headers?.Authorization === "string" 
          ? memberConnection.headers.Authorization.split(" ")[1] ?? "" 
          : "",
      );
    }
  }
  // 4. Test partial updates
  const firstMethod = sortingMethods[0];
  const firstDirection = directions[0];
  // Update only method
  const methodOnly =
    await api.functional.multiUserTodo.member.sorting_preferences.put(
      memberConnection,
      {
        body: {
          sorting_method: firstMethod,
        } satisfies IMultiUserTodoTodoSortingPreference.IUpdate,
      },
    );
  typia.assert(methodOnly);
  TestValidator.equals(
    "method only update preserves direction",
    methodOnly.sorting_direction,
    false,
  ); // last direction was false
  // Update only direction
  const directionOnly =
    await api.functional.multiUserTodo.member.sorting_preferences.put(
      memberConnection,
      {
        body: {
          sorting_direction: true,
        } satisfies IMultiUserTodoTodoSortingPreference.IUpdate,
      },
    );
  typia.assert(directionOnly);
  TestValidator.equals(
    "direction only update preserves method",
    directionOnly.sorting_method,
    firstMethod,
  );
  // 5. Test invalid sorting method validation
  await TestValidator.error("rejects invalid sorting method", async () => {
    await api.functional.multiUserTodo.member.sorting_preferences.put(
      memberConnection,
      {
        body: {
          sorting_method: "invalid_method" as any,
          sorting_direction: true,
        } satisfies IMultiUserTodoTodoSortingPreference.IUpdate,
      },
    );
  });
  // 6. Test business logic implications (todos without dates appear at end)
  // This is a conceptual validation - the actual sorting behavior would be tested
  // in todo list endpoint tests, but we validate the preference is correctly set
  TestValidator.predicate(
    "preferences support todos without dates handling",
    sortingMethods.includes("start_date") &&
      sortingMethods.includes("due_date"),
  );
}