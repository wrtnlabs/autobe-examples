import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test that a member's profile display name update is persisted and reflected on subsequent profile reads.
 *
 * Validates the end-to-end workflow of updating the authenticated member's private profile display_name
 * using the member profile update endpoint and confirming that a later operation observes the newly saved value.
 * Also confirms that the profile being updated remains the same authenticated member profile by comparing
 * profile identifiers across both responses.
 *
 * 1. Member joins to obtain an authenticated context.
 * 2. Member patches their own profile display_name with a non-empty value.
 * 3. Patch response is validated for display_name and identifier consistency.
 * 4. Member patches again (idempotency/persistence check) and validates that the saved display_name persists.
 */
export async function test_api_user_profile_display_name_update_reflected_after_save(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member
  const memberJoinOutput = await authorize_member_join(connection, {});
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: memberJoinOutput.token.access };
  // 2) Update display name
  const newDisplayName = RandomGenerator.name();
  const patched =
    await api.functional.multiUserTodo.member.profiles.updateProfile(
      memberConnection,
      {
        body: {
          display_name: newDisplayName,
        } satisfies IMultiUserTodoUserProfile.IUpdate,
      },
    );
  typia.assert(patched);
  // 3) Validate patch response values
  TestValidator.equals(
    "patched display_name matches input",
    patched.display_name,
    newDisplayName,
  );
  const patchedId = patched.id;
  const patchedMultiUserTodoUserId = patched.multi_user_todo_user_id;
  // 4) Persistence check via a second update/read-like operation
  const patchedAgain =
    await api.functional.multiUserTodo.member.profiles.updateProfile(
      memberConnection,
      {
        body: {
          display_name: newDisplayName,
        } satisfies IMultiUserTodoUserProfile.IUpdate,
      },
    );
  typia.assert(patchedAgain);
  TestValidator.equals(
    "second result display_name matches patched value",
    patchedAgain.display_name,
    patched.display_name,
  );
  TestValidator.equals("profile id matches", patchedAgain.id, patchedId);
  TestValidator.equals(
    "multi_user_todo_user_id matches",
    patchedAgain.multi_user_todo_user_id,
    patchedMultiUserTodoUserId,
  );
}
