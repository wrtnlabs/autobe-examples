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
 * Test profile update with omitted display_name preserves existing value.
 *
 * Validates the edge case where display_name is omitted from the update request, verifying the existing value is preserved.
 *
 * 1. Register a new member account with initial display name 'Original Name'.
 * 2. Authenticate and obtain access token through the join operation.
 * 3. Send PUT request to /todoApp/member/profile with empty request body (no display_name field).
 * 4. Verify response returns ITodoAppMember with original display name 'Original Name' unchanged.
 * 5. Verify updated_at timestamp is still updated despite no field changes.
 *
 * Business Logic Validation:
 * - Omitting display_name from request preserves the existing value.
 * - The endpoint does not require display_name in the request body.
 * - Updated timestamp is still refreshed on successful update call.
 * - No errors occur when display_name is not provided.
 * - Profile update operation succeeds even with empty request body.
 */
export async function test_api_member_profile_display_name_preserve_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member with specific display name
  const memberConnection: api.IConnection = { host: connection.host };
  const originalDisplayName = "Original Name";
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      displayName: originalDisplayName,
    },
  });
  typia.assert(authorized);
  // 2. Store original timestamps for comparison
  const originalUpdatedAt = authorized.updated_at;
  // 3. Send update request with empty body (no display_name field)
  const updatedProfile = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {} satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 4. Verify display_name is preserved
  TestValidator.equals(
    "display_name preserved",
    updatedProfile.display_name,
    originalDisplayName,
  );
  // 5. Verify updated_at timestamp changed (showing update occurred)
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedProfile.updated_at,
    originalUpdatedAt,
  );
}
