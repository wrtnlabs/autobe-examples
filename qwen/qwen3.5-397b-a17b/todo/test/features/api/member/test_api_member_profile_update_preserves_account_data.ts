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
 * Test that updating the profile display name preserves all other account information unchanged.
 *
 * This test validates that profile updates are scoped correctly and do not inadvertently modify
 * other account fields, ensuring data integrity during profile management operations.
 *
 * Test flow:
 * 1. Register a new member account with specific email and initial display name
 * 2. Capture the original account data (id, email, created_at, deleted_at)
 * 3. Update the display name to a new value
 * 4. Verify the email remains unchanged
 * 5. Verify the id remains unchanged
 * 6. Verify the created_at timestamp remains unchanged
 * 7. Verify deleted_at remains null (account not deleted)
 * 8. Verify only display_name and updated_at have changed
 */
export async function test_api_member_profile_update_preserves_account_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account with specific credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const initialDisplayName = RandomGenerator.name();
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: initialEmail,
      password: RandomGenerator.alphaNumeric(16),
      display_name: initialDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Capture the original account data before update
  const originalId = authorized.id;
  const originalEmail = authorized.email;
  const originalCreatedAt = authorized.created_at;
  const originalDeletedAt = authorized.deleted_at;
  const originalDisplayName = authorized.display_name;
  // 3. Update the display name to a new value
  const newDisplayName = RandomGenerator.name();
  const updatedProfile = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 4. Verify the email remains unchanged
  TestValidator.equals("email unchanged", updatedProfile.email, originalEmail);
  // 5. Verify the id remains unchanged
  TestValidator.equals("id unchanged", updatedProfile.id, originalId);
  // 6. Verify the created_at timestamp remains unchanged
  TestValidator.equals(
    "created_at unchanged",
    updatedProfile.created_at,
    originalCreatedAt,
  );
  // 7. Verify deleted_at remains null (account not deleted)
  TestValidator.equals(
    "deleted_at remains null",
    updatedProfile.deleted_at,
    originalDeletedAt,
  );
  TestValidator.predicate(
    "account not deleted",
    updatedProfile.deleted_at === null,
  );
  // 8. Verify display_name has changed to the new value
  TestValidator.notEquals(
    "display_name changed",
    updatedProfile.display_name,
    originalDisplayName,
  );
  TestValidator.equals(
    "display_name matches new value",
    updatedProfile.display_name,
    newDisplayName,
  );
  // 9. Verify updated_at has changed (profile was updated)
  TestValidator.notEquals(
    "updated_at changed",
    updatedProfile.updated_at,
    originalCreatedAt,
  );
}
