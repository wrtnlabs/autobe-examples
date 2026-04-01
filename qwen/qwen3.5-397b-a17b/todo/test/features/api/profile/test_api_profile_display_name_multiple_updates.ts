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

/**
 * Test that display name can be updated multiple times without restrictions.
 *
 * This test validates:
 * 1. Member can update their display name multiple times
 * 2. Each update succeeds immediately
 * 3. The updated_at timestamp changes with each modification
 * 4. The final profile reflects the last submitted display name
 */
export async function test_api_profile_display_name_multiple_updates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Perform first display name update
  const firstName = RandomGenerator.name(2);
  const firstUpdate = await api.functional.multiUserTodo.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: firstName,
      } satisfies IMultiUserTodoUserProfile.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  TestValidator.equals(
    "first update display name",
    firstUpdate.displayName,
    firstName,
  );
  // 3. Perform second display name update
  const secondName = RandomGenerator.name(3);
  const secondUpdate = await api.functional.multiUserTodo.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: secondName,
      } satisfies IMultiUserTodoUserProfile.IUpdate,
    },
  );
  typia.assert(secondUpdate);
  TestValidator.equals(
    "second update display name",
    secondUpdate.displayName,
    secondName,
  );
  TestValidator.notEquals(
    "updated_at changed after second update",
    firstUpdate.updatedAt,
    secondUpdate.updatedAt,
  );
  // 4. Perform third display name update
  const thirdName = RandomGenerator.name(2);
  const thirdUpdate = await api.functional.multiUserTodo.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: thirdName,
      } satisfies IMultiUserTodoUserProfile.IUpdate,
    },
  );
  typia.assert(thirdUpdate);
  TestValidator.equals(
    "third update display name",
    thirdUpdate.displayName,
    thirdName,
  );
  TestValidator.notEquals(
    "updated_at changed after third update",
    secondUpdate.updatedAt,
    thirdUpdate.updatedAt,
  );
  // 5. Verify final profile reflects last display name
  TestValidator.equals(
    "final display name matches last update",
    thirdUpdate.displayName,
    thirdName,
  );
}
