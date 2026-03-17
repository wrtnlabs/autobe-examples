import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can successfully clear their display name by passing null.
 *
 * Prerequisites:
 * 1. Create a new member account via join endpoint
 *
 * Test Steps:
 * 1. First, set a display name via PUT /privateTodoApp/member/profile with a valid string
 * 2. Then call PUT /privateTodoApp/member/profile with display_name set to null
 * 3. Verify the response returns HTTP 200 with the updated member profile
 * 4. Validate the response body contains:
 *    - displayName is null (cleared)
 *    - updatedAt timestamp is updated again
 *    - All other fields remain unchanged
 *
 * Business Logic Validation:
 * - Display name can be explicitly cleared with null value
 * - Nullable field behavior works correctly
 * - Previous value is properly replaced with null
 * - This demonstrates the self-service permission to unset optional profile data
 */
export async function test_api_profile_display_name_clear(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // 2. Set a display name first
  const initialDisplayName = RandomGenerator.name();
  const profileWithDisplayName =
    await api.functional.privateTodoApp.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: initialDisplayName,
        } satisfies IPrivateTodoAppMember.IUpdate,
      },
    );
  typia.assert(profileWithDisplayName);
  // Verify display name was set
  TestValidator.equals(
    "display name should be set",
    profileWithDisplayName.displayName,
    initialDisplayName,
  );
  // Store the updated_at timestamp for comparison
  const updatedAtBefore = profileWithDisplayName.updatedAt;
  // 3. Clear the display name by passing null
  const profileWithClearedName =
    await api.functional.privateTodoApp.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: null,
        } satisfies IPrivateTodoAppMember.IUpdate,
      },
    );
  typia.assert(profileWithClearedName);
  // 4. Validate the response
  // Display name should be null (cleared)
  TestValidator.equals(
    "display name should be cleared to null",
    profileWithClearedName.displayName,
    null,
  );
  // Updated timestamp should be updated
  TestValidator.notEquals(
    "updated_at should be updated",
    profileWithClearedName.updatedAt,
    updatedAtBefore,
  );
  // Other fields should remain unchanged
  TestValidator.equals(
    "id should remain unchanged",
    profileWithClearedName.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "email should remain unchanged",
    profileWithClearedName.email,
    authorizedMember.email,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    profileWithClearedName.createdAt,
    authorizedMember.createdAt,
  );
}
