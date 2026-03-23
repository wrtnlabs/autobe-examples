import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_requires_authentication(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that profile updates require valid authentication.
   *
   * 1. Attempt profile update without authentication (should fail with 401)
   * 2. Register and authenticate a member
   * 3. Successfully update profile with authentication
   * 4. Validate the updated profile data
   */
  // Step 1: Try to update profile without authentication (should fail)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated profile update should fail with 401",
    401,
    async () =>
      await api.functional.multiUserTodo.member.profile.update(
        unauthenticatedConnection,
        {
          body: {
            display_name: RandomGenerator.name(),
          } satisfies IMultiUserTodoMember.IUpdate,
        },
      ),
  );
  // Step 2: Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Step 3: Successfully update profile with authentication
  const newDisplayName = RandomGenerator.name();
  const updatedProfile =
    await api.functional.multiUserTodo.member.profile.update(memberConnection, {
      body: {
        display_name: newDisplayName,
      } satisfies IMultiUserTodoMember.IUpdate,
    });
  typia.assert(updatedProfile);
  // Step 4: Validate the updated profile
  TestValidator.equals(
    "display name should be updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "member ID should match",
    updatedProfile.id,
    authorized.id,
  );
  TestValidator.predicate(
    "email should be preserved",
    updatedProfile.email === authorized.email,
  );
  TestValidator.predicate(
    "account should be active (deleted_at is null)",
    updatedProfile.deleted_at === null,
  );
}
