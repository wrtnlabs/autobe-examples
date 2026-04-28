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

/**
 * Test clearing the member's display name by explicitly setting it to null.
 *
 * Validates that the profile update endpoint correctly handles null values for the nullable display_name field. When a member explicitly sets display_name to null, the field should be cleared while preserving all other member data including id, email, and lifecycle timestamps.
 *
 * 1. Member registers with an initial display name set.
 * 2. Member updates their profile by explicitly setting display_name to null.
 * 3. Validates that display_name is successfully cleared to null.
 * 4. Verifies that updated_at reflects the profile change.
 * 5. Confirms that id, email, and created_at remain unchanged.
 * 6. Ensures the member account is still active (deleted_at is null).
 */
export async function test_api_profile_update_clear_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with a display name
  const memberConnection: api.IConnection = { host: connection.host };
  const initialDisplayName = RandomGenerator.name();
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: { display_name: initialDisplayName },
  });
  typia.assert(authorizedMember);
  // 2. Update profile to clear display_name by setting to null
  const body = {
    display_name: null,
  } satisfies ITodoAppMember.IUpdate;
  const updatedMember = await api.functional.todoApp.profile.update(
    memberConnection,
    { body },
  );
  typia.assert(updatedMember);
  // 3. Validate display_name is null
  TestValidator.equals(
    "display_name is cleared to null",
    updatedMember.display_name,
    null,
  );
  // 4. Verify updated_at changed (after created_at)
  TestValidator.predicate(
    "updated_at reflects the profile change",
    new Date(updatedMember.updated_at).getTime() >=
      new Date(updatedMember.created_at).getTime(),
  );
  // 5. Verify other fields remain unchanged
  TestValidator.equals(
    "member id unchanged",
    updatedMember.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "member email unchanged",
    updatedMember.email,
    authorizedMember.email,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedMember.created_at,
    authorizedMember.created_at,
  );
  // 6. Verify account is still active
  TestValidator.equals(
    "account is still active",
    updatedMember.deleted_at,
    null,
  );
}
