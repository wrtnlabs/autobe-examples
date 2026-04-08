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
 * Test that profile retrieval reflects updates made to the member's display name and shows updated timestamp change.
 *
 * Validates the complete profile update workflow including member registration, profile modification, and profile retrieval. Ensures that profile updates are immediately reflected in subsequent retrievals and that timestamp tracking works correctly.
 *
 * Special attention is given to verifying that the display_name change is persisted correctly, the updated_at timestamp is automatically updated on profile modification, and the created_at timestamp remains immutable from the original registration time.
 *
 * 1. Register a new member account with initial display name via POST /todoApp/auth/member/join.
 * 2. Update the member's profile with a new display name via PUT /todoApp/member/profile.
 * 3. Retrieve the updated profile via GET /todoApp/member/profile.
 * 4. Validate the response shows the new display_name matching the update request.
 * 5. Verify updated_at timestamp is later than created_at timestamp (proving update was recorded).
 * 6. Confirm id and created_at remain unchanged from original registration.
 * 7. Verify deleted_at remains null (account still active).
 */
export async function test_api_member_profile_after_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(joinResult);
  // Store original values for comparison
  const originalId = joinResult.id;
  const originalCreatedAt = joinResult.created_at;
  const originalDisplayName = joinResult.display_name;
  // 2. Update member's profile with new display name
  const newDisplayName = RandomGenerator.name();
  const updateResult = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        displayName: newDisplayName,
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(updateResult);
  // 3. Retrieve the updated profile
  const profileResult =
    await api.functional.todoApp.member.profile.at(memberConnection);
  typia.assert(profileResult);
  // 4. Validate display_name matches the update request
  TestValidator.equals(
    "display_name matches update",
    profileResult.display_name,
    newDisplayName,
  );
  // 5. Verify updated_at is later than created_at
  const updatedAt = new Date(profileResult.updated_at);
  const createdAt = new Date(profileResult.created_at);
  TestValidator.predicate(
    "updated_at is later than created_at",
    updatedAt.getTime() > createdAt.getTime(),
  );
  // 6. Confirm id and created_at remain unchanged
  TestValidator.equals("id unchanged", profileResult.id, originalId);
  TestValidator.equals(
    "created_at unchanged",
    profileResult.created_at,
    originalCreatedAt,
  );
  // 7. Verify deleted_at remains null (account active)
  TestValidator.equals("deleted_at is null", profileResult.deleted_at, null);
  // Additional validation: display_name actually changed from original
  TestValidator.notEquals(
    "display_name changed from original",
    profileResult.display_name,
    originalDisplayName,
  );
}
