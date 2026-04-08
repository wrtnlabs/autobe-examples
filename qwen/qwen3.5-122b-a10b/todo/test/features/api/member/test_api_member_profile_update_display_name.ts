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
 * Validates the complete workflow of updating a member's display name through the profile update endpoint. The test ensures that the display name is successfully updated in the database and the response contains the updated member profile with the new display name and updated_at timestamp.
 *
 * The test creates a new member account, updates their display name with a valid name between 1-100 characters, and verifies that subsequent profile retrieval operations return the updated display name. Special attention is given to timestamp consistency validation.
 *
 * 1. Register a new member account with initial display name.
 * 2. Capture the initial member profile with original display_name and created_at.
 * 3. Update the display name via PATCH /todoApp/members endpoint.
 * 4. Validate the response contains updated member profile with new display_name.
 * 5. Verify updated_at timestamp is different from created_at and is after it.
 * 6. Confirm the new display name meets length requirements (1-100 characters).
 */
export async function test_api_member_profile_update_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account with initial display name
  const memberConnection: api.IConnection = { host: connection.host };
  const initialProfile: ITodoAppMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppMember.IJoin,
    });
  typia.assert(initialProfile);
  // 2. Capture initial profile data for comparison
  const originalDisplayName: string = initialProfile.display_name;
  const originalCreatedAt: string = initialProfile.created_at;
  // 3. Prepare update payload with new display name (1-100 characters)
  const newDisplayName: string = RandomGenerator.name(3);
  const updateBody: ITodoAppMember.IUpdate = {
    displayName: newDisplayName,
  } satisfies ITodoAppMember.IUpdate;
  // 4. Update the display name via PATCH /todoApp/members endpoint
  const updatedProfile: ITodoAppMember =
    await api.functional.todoApp.members.update(memberConnection, {
      body: updateBody,
    });
  typia.assert(updatedProfile);
  // 5. Validate the response contains updated member profile with new display_name
  TestValidator.equals(
    "display name updated to new value",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.notEquals(
    "display name differs from original",
    updatedProfile.display_name,
    originalDisplayName,
  );
  // 6. Verify updated_at timestamp is set and different from created_at
  TestValidator.predicate(
    "updated_at exists",
    updatedProfile.updated_at !== null &&
      updatedProfile.updated_at !== undefined,
  );
  TestValidator.notEquals(
    "updated_at differs from created_at",
    updatedProfile.updated_at,
    originalCreatedAt,
  );
  // 7. Verify updated_at is after created_at (temporal consistency)
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedProfile.updated_at) > new Date(originalCreatedAt),
  );
  // 8. Confirm the new display name meets length requirements (1-100 characters)
  TestValidator.predicate(
    "display name length between 1-100 characters",
    updatedProfile.display_name.length >= 1 &&
      updatedProfile.display_name.length <= 100,
  );
  // 9. Verify all other member fields remain unchanged
  TestValidator.equals(
    "member ID unchanged",
    updatedProfile.id,
    initialProfile.id,
  );
  TestValidator.equals(
    "email unchanged",
    updatedProfile.email,
    initialProfile.email,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedProfile.created_at,
    originalCreatedAt,
  );
  TestValidator.equals("deleted_at is null", updatedProfile.deleted_at, null);
}
