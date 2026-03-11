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

// <SCENARIO DESCRIPTION HERE>
export async function test_api_member_sorting_preferences_default(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Register a new member using utility function
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authorizedMember);
  // Retrieve sorting preferences for the new member
  const preferences =
    await api.functional.multiUserTodo.member.sorting_preferences.at(
      memberConnection,
    );
  typia.assert(preferences);
  // Validate response structure
  TestValidator.predicate(
    "sorting preference has valid sorting method",
    preferences.sorting_method === "creation_date" ||
      preferences.sorting_method === "start_date" ||
      preferences.sorting_method === "due_date",
  );
  TestValidator.predicate(
    "sorting direction is boolean",
    typeof preferences.sorting_direction === "boolean",
  );
  TestValidator.equals(
    "preferences belong to the registered member",
    preferences.member.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "member email matches",
    preferences.member.email,
    authorizedMember.email,
  );
  TestValidator.equals(
    "member display name matches",
    preferences.member.display_name,
    authorizedMember.display_name,
  );
  TestValidator.predicate(
    "timestamps are valid ISO strings",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(preferences.created_at) &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(preferences.updated_at),
  );
}
