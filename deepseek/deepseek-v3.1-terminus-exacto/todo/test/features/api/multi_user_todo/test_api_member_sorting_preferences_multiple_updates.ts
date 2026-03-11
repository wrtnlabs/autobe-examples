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

export async function test_api_member_sorting_preferences_multiple_updates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAuth);
  // Set initial preferences: creation_date ascending
  const initialPreferences =
    await api.functional.multiUserTodo.member.sorting_preferences.patch(
      memberConnection,
      {
        body: {
          sorting_method: "creation_date",
          sorting_direction: true,
        } satisfies IMultiUserTodoTodoSortingPreference.IUpdate,
      },
    );
  typia.assert(initialPreferences);
  // Store initial timestamps
  const initialCreatedAt = initialPreferences.created_at;
  const initialUpdatedAt = initialPreferences.updated_at;
  // Verify initial preferences
  TestValidator.equals(
    "initial sorting method",
    initialPreferences.sorting_method,
    "creation_date",
  );
  TestValidator.equals(
    "initial sorting direction",
    initialPreferences.sorting_direction,
    true,
  );
  // Wait a moment to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Update to due_date descending
  const secondPreferences =
    await api.functional.multiUserTodo.member.sorting_preferences.patch(
      memberConnection,
      {
        body: {
          sorting_method: "due_date",
          sorting_direction: false,
        } satisfies IMultiUserTodoTodoSortingPreference.IUpdate,
      },
    );
  typia.assert(secondPreferences);
  // Verify second update
  TestValidator.equals(
    "second sorting method",
    secondPreferences.sorting_method,
    "due_date",
  );
  TestValidator.equals(
    "second sorting direction",
    secondPreferences.sorting_direction,
    false,
  );
  TestValidator.equals(
    "created_at remains constant",
    secondPreferences.created_at,
    initialCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    secondPreferences.updated_at,
    initialUpdatedAt,
  );
  // Wait a moment to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Update to start_date ascending
  const thirdPreferences =
    await api.functional.multiUserTodo.member.sorting_preferences.patch(
      memberConnection,
      {
        body: {
          sorting_method: "start_date",
          sorting_direction: true,
        } satisfies IMultiUserTodoTodoSortingPreference.IUpdate,
      },
    );
  typia.assert(thirdPreferences);
  // Verify third update
  TestValidator.equals(
    "third sorting method",
    thirdPreferences.sorting_method,
    "start_date",
  );
  TestValidator.equals(
    "third sorting direction",
    thirdPreferences.sorting_direction,
    true,
  );
  TestValidator.equals(
    "created_at remains constant",
    thirdPreferences.created_at,
    initialCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed again",
    thirdPreferences.updated_at,
    secondPreferences.updated_at,
  );
  // Test partial update - update only direction
  const partialUpdate =
    await api.functional.multiUserTodo.member.sorting_preferences.patch(
      memberConnection,
      {
        body: {
          sorting_direction: false,
        } satisfies IMultiUserTodoTodoSortingPreference.IUpdate,
      },
    );
  typia.assert(partialUpdate);
  // Verify partial update overwrites completely
  TestValidator.equals(
    "method remains after partial update",
    partialUpdate.sorting_method,
    "start_date",
  );
  TestValidator.equals(
    "direction updated",
    partialUpdate.sorting_direction,
    false,
  );
  TestValidator.notEquals(
    "updated_at changed for partial update",
    partialUpdate.updated_at,
    thirdPreferences.updated_at,
  );
  // Final verification: Test that preferences persist by making another update
  const finalUpdate =
    await api.functional.multiUserTodo.member.sorting_preferences.patch(
      memberConnection,
      {
        body: {
          sorting_method: "creation_date",
          sorting_direction: false,
        } satisfies IMultiUserTodoTodoSortingPreference.IUpdate,
      },
    );
  typia.assert(finalUpdate);
  // Verify final state
  TestValidator.equals(
    "final sorting method",
    finalUpdate.sorting_method,
    "creation_date",
  );
  TestValidator.equals(
    "final sorting direction",
    finalUpdate.sorting_direction,
    false,
  );
  TestValidator.equals(
    "created_at remains constant throughout",
    finalUpdate.created_at,
    initialCreatedAt,
  );
}
