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
 * Test the scenario where a member sets their initial sorting preferences after account creation.
 * Verify that when a member with no existing sorting preferences makes their first preference update,
 * the system correctly creates a new preference record.
 * Validate that the response includes the complete preference object with the correct
 * sorting_method (creation_date, start_date, or due_date) and sorting_direction
 * (true for ascending, false for descending). Confirm that timestamps (created_at and updated_at)
 * are properly set and that the preference is associated with the authenticated member.
 */
export async function test_api_member_sorting_preferences_initial_setup(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member connection using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorizedMember);
  // 2. Set initial sorting preferences (test with creation_date ascending)
  const preference =
    await api.functional.multiUserTodo.member.sorting_preferences.patch(
      memberConnection,
      {
        body: {
          sorting_method: "creation_date",
          sorting_direction: true,
        } satisfies IMultiUserTodoTodoSortingPreference.IUpdate,
      },
    );
  typia.assert(preference);
  // 3. Validate response properties
  TestValidator.equals(
    "sorting method",
    preference.sorting_method,
    "creation_date",
  );
  TestValidator.equals("sorting direction", preference.sorting_direction, true);
  TestValidator.predicate("has id", () =>
    /^[0-9a-f-]{36}$/i.test(preference.id),
  );
  // Validate timestamps
  const createdAt = new Date(preference.created_at);
  const updatedAt = new Date(preference.updated_at);
  TestValidator.predicate(
    "created_at is valid date",
    () => !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    () => !isNaN(updatedAt.getTime()),
  );
  // Validate member association
  TestValidator.equals(
    "member id matches",
    preference.member.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "member email matches",
    preference.member.email,
    authorizedMember.email,
  );
  TestValidator.equals(
    "member display_name matches",
    preference.member.display_name,
    authorizedMember.display_name,
  );
}
