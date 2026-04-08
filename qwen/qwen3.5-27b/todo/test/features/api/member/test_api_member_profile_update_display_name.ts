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
 * Test updating a member's display name through the profile update endpoint.
 *
 * Validates the complete profile update workflow including member registration, authentication, and display name modification. Ensures that the display name is correctly updated and that the updated_at timestamp is automatically refreshed upon modification.
 *
 * Special attention is given to verifying that the member's identity remains consistent (id, email unchanged) while only the display_name and updated_at fields are modified.
 *
 * 1. Register a new member account with email, password, and optional display name.
 * 2. Update the member's display name to a new value.
 * 3. Validate the response contains the updated display name.
 * 4. Verify the updated_at timestamp has been refreshed.
 * 5. Confirm other fields (id, email, created_at, deleted_at) remain unchanged.
 */
export async function test_api_member_profile_update_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      display_name: null,
    },
  });
  typia.assert(authorized);
  // Store original values for comparison
  const originalId = authorized.id;
  const originalEmail = authorized.email;
  const originalCreatedAt = authorized.created_at;
  const originalUpdatedAt = authorized.updated_at;
  // 2. Update the member's display name
  const updatedMember =
    await api.functional.todoApp.member.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: "John Doe",
        } satisfies ITodoAppMember.IUpdate,
      },
    );
  typia.assert(updatedMember);
  // 3. Validate the display name was updated
  TestValidator.equals(
    "display name matches input",
    updatedMember.display_name,
    "John Doe",
  );
  // 4. Verify the updated_at timestamp was refreshed
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedMember.updated_at,
    originalUpdatedAt,
  );
  // 5. Confirm other fields remain unchanged
  TestValidator.equals("member id unchanged", updatedMember.id, originalId);
  TestValidator.equals("email unchanged", updatedMember.email, originalEmail);
  TestValidator.equals(
    "created_at unchanged",
    updatedMember.created_at,
    originalCreatedAt,
  );
  TestValidator.equals("account is active", updatedMember.deleted_at, null);
}
