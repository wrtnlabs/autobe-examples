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

export async function test_api_profile_display_name_optional_field(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(auth);
  // 2. Update profile with empty body (no display_name field)
  // This tests that display_name is truly optional
  const updatedProfile =
    await api.functional.multiUserTodo.member.profile.update(memberConnection, {
      body: {} satisfies IMultiUserTodoUserProfile.IUpdate,
    });
  typia.assert(updatedProfile);
  // 3. Store the initial display name for comparison
  const initialDisplayName = updatedProfile.displayName;
  // 4. Update profile with a new display name to verify partial update works
  const newDisplayName = RandomGenerator.name();
  const profileWithNewName =
    await api.functional.multiUserTodo.member.profile.update(memberConnection, {
      body: {
        display_name: newDisplayName,
      } satisfies IMultiUserTodoUserProfile.IUpdate,
    });
  typia.assert(profileWithNewName);
  // 5. Validate the display name was updated
  TestValidator.equals(
    "display name updated",
    profileWithNewName.displayName,
    newDisplayName,
  );
  // 6. Update profile again with empty body to verify display name is preserved
  const profileAfterEmptyUpdate =
    await api.functional.multiUserTodo.member.profile.update(memberConnection, {
      body: {} satisfies IMultiUserTodoUserProfile.IUpdate,
    });
  typia.assert(profileAfterEmptyUpdate);
  // 7. Validate that display name was preserved (not cleared by empty update)
  TestValidator.equals(
    "display name preserved after empty update",
    profileAfterEmptyUpdate.displayName,
    newDisplayName,
  );
}
