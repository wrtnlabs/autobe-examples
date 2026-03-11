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
 * Test the retrieval of sorting preferences after a member has configured their preferred sorting method and direction.
 *
 * 1. Authenticate as a member
 * 2. Set initial sorting preferences using random valid values
 * 3. Retrieve the saved preferences
 * 4. Validate that retrieved preferences match what was configured
 * 5. Validate timestamps and member association
 */
export async function test_api_member_sorting_preferences_configured(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Test all possible sorting method and direction combinations
  const sortingMethods = ["creation_date", "start_date", "due_date"] as const;
  const sortingDirections = [true, false] as const;
  for (const sortingMethod of sortingMethods) {
    for (const sortingDirection of sortingDirections) {
      // 2. Configure sorting preferences
      const updateBody = {
        sorting_method: sortingMethod,
        sorting_direction: sortingDirection,
      } satisfies IMultiUserTodoTodoSortingPreference.IUpdate;
      const configured =
        await api.functional.multiUserTodo.member.sorting_preferences.put(
          memberConnection,
          { body: updateBody },
        );
      typia.assert(configured);
      // 3. Retrieve saved preferences
      const retrieved =
        await api.functional.multiUserTodo.member.sorting_preferences.at(
          memberConnection,
        );
      typia.assert(retrieved);
      // 4. Validate that retrieved preferences match what was configured
      TestValidator.equals(
        "sorting method matches",
        retrieved.sorting_method,
        sortingMethod,
      );
      TestValidator.equals(
        "sorting direction matches",
        retrieved.sorting_direction,
        sortingDirection,
      );
      // 5. Validate timestamps are properly set
      TestValidator.predicate(
        "has created_at timestamp",
        () => new Date(retrieved.created_at).getTime() > 0,
      );
      TestValidator.predicate(
        "has updated_at timestamp",
        () => new Date(retrieved.updated_at).getTime() > 0,
      );
      // 6. Validate member association
      TestValidator.equals(
        "member id matches authenticated user",
        retrieved.member.id,
        authorized.id,
      );
      TestValidator.equals(
        "member email matches",
        retrieved.member.email,
        authorized.email,
      );
      TestValidator.equals(
        "member display_name matches",
        retrieved.member.display_name,
        authorized.display_name,
      );
    }
  }
}
