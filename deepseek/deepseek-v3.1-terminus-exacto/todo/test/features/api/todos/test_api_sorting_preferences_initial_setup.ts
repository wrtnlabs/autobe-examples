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

export async function test_api_sorting_preferences_initial_setup(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member);
  // 2. Set initial sorting preferences for due date ascending
  const preferencesBody = {
    sorting_method: "due_date" as const,
    sorting_direction: true,
  } satisfies IMultiUserTodoTodoSortingPreference.IUpdate;
  const preferences =
    await api.functional.multiUserTodo.member.sorting_preferences.put(
      memberConnection,
      {
        body: preferencesBody,
      },
    );
  typia.assert(preferences);
  // 3. Validate the preferences response
  TestValidator.equals(
    "sorting method",
    preferences.sorting_method,
    "due_date",
  );
  TestValidator.predicate(
    "sorting direction ascending",
    preferences.sorting_direction === true,
  );
  TestValidator.predicate(
    "has created at timestamp",
    preferences.created_at !== null && preferences.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated at timestamp",
    preferences.updated_at !== null && preferences.updated_at !== undefined,
  );
  TestValidator.predicate(
    "has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      preferences.id,
    ),
  );
  // 4. Verify member association
  TestValidator.equals("member id matches", preferences.member.id, member.id);
  TestValidator.equals(
    "member email matches",
    preferences.member.email,
    member.email,
  );
  TestValidator.equals(
    "member display name matches",
    preferences.member.display_name,
    member.display_name,
  );
}
