import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_update_success_display_name_changes(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(joined);
  const initialProfileConnection: api.IConnection = { host: connection.host };
  initialProfileConnection.headers = {
    Authorization: joined.token.access,
  };
  // Capture initial profile state (before first update)
  const displayName1 =
    `${RandomGenerator.name()}-${RandomGenerator.alphabets(6)}`.trim();
  const updated1 = await api.functional.multiUserTodo.member.profile.update(
    initialProfileConnection,
    {
      body: {
        displayName: displayName1,
      } satisfies IMultiUserTodoUserProfile.IUpdate,
    },
  );
  typia.assert(updated1);
  TestValidator.equals(
    "memberId matches authenticated member",
    updated1.memberId,
    joined.id,
  );
  TestValidator.equals(
    "displayName equals submitted value (1)",
    updated1.displayName,
    displayName1,
  );
  TestValidator.predicate(
    "createdAt <= updatedAt (1)",
    updated1.createdAt <= updated1.updatedAt,
  );
  // 4) Repeat with a second distinct display name
  const displayName2 =
    `${RandomGenerator.name()}-${RandomGenerator.alphabets(6)}`.trim();
  TestValidator.notEquals(
    "displayName1 != displayName2",
    displayName1,
    displayName2,
  );
  // ensure later timestamp
  const beforeCreatedAt = updated1.createdAt;
  const beforeUpdatedAt = updated1.updatedAt;
  const updated2 = await api.functional.multiUserTodo.member.profile.update(
    initialProfileConnection,
    {
      body: {
        displayName: displayName2,
      } satisfies IMultiUserTodoUserProfile.IUpdate,
    },
  );
  typia.assert(updated2);
  TestValidator.equals(
    "memberId matches authenticated member (2)",
    updated2.memberId,
    joined.id,
  );
  TestValidator.equals(
    "displayName equals submitted value (2)",
    updated2.displayName,
    displayName2,
  );
  TestValidator.equals(
    "createdAt unchanged after updates",
    updated2.createdAt,
    beforeCreatedAt,
  );
  TestValidator.predicate(
    "updatedAt advanced (2)",
    updated2.updatedAt >= beforeUpdatedAt,
  );
}
