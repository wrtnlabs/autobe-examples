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

/**
 * Test that an authenticated member can successfully update their display name.
 *
 * This test verifies the complete profile update workflow:
 * 1. Register a new member with initial display name
 * 2. Update the display name to a new value
 * 3. Validate the updated profile contains the new display name
 * 4. Verify other fields remain unchanged
 * 5. Confirm updated_at timestamp was refreshed
 */
export async function test_api_member_profile_update_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(joined);
  // Store original values for comparison
  const originalDisplayName = joined.display_name;
  const originalEmail = joined.email;
  const originalCreatedAt = joined.created_at;
  const originalUpdatedAt = joined.updated_at;
  // 2. Generate new display name
  const newDisplayName = RandomGenerator.name();
  // 3. Update profile with new display name
  const updated = await api.functional.multiUserTodo.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies IMultiUserTodoMember.IUpdate,
    },
  );
  typia.assert(updated);
  // 4. Validate display name was updated
  TestValidator.equals(
    "display name matches new value",
    updated.display_name,
    newDisplayName,
  );
  TestValidator.notEquals(
    "display name changed from original",
    updated.display_name,
    originalDisplayName,
  );
  // 5. Validate other fields remain unchanged
  TestValidator.equals("email unchanged", updated.email, originalEmail);
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    originalCreatedAt,
  );
  TestValidator.equals("id unchanged", updated.id, joined.id);
  // 6. Validate updated_at was refreshed
  TestValidator.notEquals(
    "updated_at was refreshed",
    updated.updated_at,
    originalUpdatedAt,
  );
  // 7. Validate account is still active
  TestValidator.equals(
    "account is active (deleted_at is null)",
    updated.deleted_at,
    null,
  );
}
