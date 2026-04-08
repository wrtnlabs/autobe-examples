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
 * Test member profile display name update functionality.
 *
 * Validates the complete profile update flow including member registration, authentication, and display name modification. Ensures that the display name is successfully updated while all other profile fields remain unchanged.
 *
 * Special attention is given to verifying that the email address cannot be modified through this endpoint, the account ID remains constant, and the updated_at timestamp accurately reflects the modification time.
 *
 * 1. Register new member account with initial display name 'Test User' using authorize_member_join utility.
 * 2. Utility function handles authentication and updates connection headers with JWT access token.
 * 3. Send PUT request to /todoApp/member/profile with new display name 'Updated User'.
 * 4. Validate response contains complete ITodoAppMember profile with updated display name.
 * 5. Verify email, id, and created_at remain unchanged from registration response.
 * 6. Verify updated_at timestamp is newer than or equal to created_at timestamp.
 */
export async function test_api_member_profile_display_name_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member with initial display name
  const initialDisplayName = "Test User";
  const authorized = await authorize_member_join(connection, {
    body: {
      displayName: initialDisplayName,
    },
  });
  typia.assert(authorized);
  // 2. Connection is already authenticated by authorize_member_join
  // The utility function updates connection.headers with the access token
  // 3. Update display name
  const newDisplayName = "Updated User";
  const updateBody = {
    displayName: newDisplayName,
  } satisfies ITodoAppMember.IUpdate;
  const updatedProfile = await api.functional.todoApp.member.profile.update(
    connection,
    {
      body: updateBody,
    },
  );
  typia.assert(updatedProfile);
  // 4. Validate display name was updated
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  // 5. Validate other fields remain unchanged
  TestValidator.equals(
    "email unchanged",
    updatedProfile.email,
    authorized.email,
  );
  TestValidator.equals("member id unchanged", updatedProfile.id, authorized.id);
  TestValidator.equals(
    "created_at unchanged",
    updatedProfile.created_at,
    authorized.created_at,
  );
  // 6. Validate updated_at is newer than or equal to created_at
  const createdAt = new Date(updatedProfile.created_at).getTime();
  const updatedAt = new Date(updatedProfile.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is newer than created_at",
    updatedAt >= createdAt,
  );
  // 7. Validate deleted_at is null (active account)
  TestValidator.equals("account is active", updatedProfile.deleted_at, null);
}
