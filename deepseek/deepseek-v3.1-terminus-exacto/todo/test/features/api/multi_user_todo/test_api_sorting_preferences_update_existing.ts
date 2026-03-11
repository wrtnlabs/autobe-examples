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

export async function test_api_sorting_preferences_update_existing(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate as member using utility function
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
  // Create initial sorting preferences
  const initialPreferences =
    await api.functional.multiUserTodo.member.sorting_preferences.put(
      memberConnection,
      {
        body: {
          sorting_method: "creation_date",
          sorting_direction: true,
        } satisfies IMultiUserTodoTodoSortingPreference.IUpdate,
      },
    );
  typia.assert(initialPreferences);
  // Store initial timestamps for comparison
  const initialCreatedAt = initialPreferences.created_at;
  const initialUpdatedAt = initialPreferences.updated_at;
  // Wait a moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Update sorting preferences with different configuration
  const updatedPreferences =
    await api.functional.multiUserTodo.member.sorting_preferences.put(
      memberConnection,
      {
        body: {
          sorting_method: "due_date",
          sorting_direction: false,
        } satisfies IMultiUserTodoTodoSortingPreference.IUpdate,
      },
    );
  typia.assert(updatedPreferences);
  // Validate that created_at remains consistent
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedPreferences.created_at,
    initialCreatedAt,
  );
  // Validate that updated_at has changed
  TestValidator.notEquals(
    "updated_at should change after update",
    updatedPreferences.updated_at,
    initialUpdatedAt,
  );
  // Validate member association persists
  TestValidator.equals(
    "member association should persist",
    updatedPreferences.member.id,
    memberAuth.id,
  );
  // Validate updated preferences are correctly stored
  TestValidator.equals(
    "sorting_method should be updated",
    updatedPreferences.sorting_method,
    "due_date",
  );
  TestValidator.equals(
    "sorting_direction should be updated",
    updatedPreferences.sorting_direction,
    false,
  );
  // Validate complete preference structure
  TestValidator.predicate(
    "preference should have valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      updatedPreferences.id,
    ),
  );
  TestValidator.predicate(
    "member summary should be valid",
    updatedPreferences.member.email === memberAuth.email &&
      updatedPreferences.member.display_name === memberAuth.display_name,
  );
}
