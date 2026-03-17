import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_multiple_sequential_updates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const authorized = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create member-specific connection with authentication token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 3. First profile update
  const firstDisplayName = RandomGenerator.name();
  const firstUpdate = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: firstDisplayName,
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  // 4. Second profile update
  const secondDisplayName = RandomGenerator.name();
  const secondUpdate = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: secondDisplayName,
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(secondUpdate);
  // 5. Third profile update
  const thirdDisplayName = RandomGenerator.name();
  const thirdUpdate = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: thirdDisplayName,
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(thirdUpdate);
  // 6. Validate each update returned correct display name
  TestValidator.equals(
    "first update display name",
    firstUpdate.display_name,
    firstDisplayName,
  );
  TestValidator.equals(
    "second update display name",
    secondUpdate.display_name,
    secondDisplayName,
  );
  TestValidator.equals(
    "third update display name",
    thirdUpdate.display_name,
    thirdDisplayName,
  );
  // 7. Validate timestamps are progressively later
  TestValidator.predicate(
    "second update after first",
    () =>
      new Date(secondUpdate.updated_at).getTime() >
      new Date(firstUpdate.updated_at).getTime(),
  );
  TestValidator.predicate(
    "third update after second",
    () =>
      new Date(thirdUpdate.updated_at).getTime() >
      new Date(secondUpdate.updated_at).getTime(),
  );
  // 8. Validate final profile reflects last update
  TestValidator.equals(
    "final display name matches third update",
    thirdUpdate.display_name,
    thirdDisplayName,
  );
  TestValidator.equals(
    "final email matches registration",
    thirdUpdate.email,
    authorized.email,
  );
  TestValidator.equals(
    "final id matches registration",
    thirdUpdate.id,
    authorized.id,
  );
}
