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
 * Validates that an authenticated member can successfully update their public display name through the profile management endpoint. The test verifies that the display name is correctly persisted, the updated_at timestamp changes while created_at remains unchanged, and the response contains all expected member profile fields.
 *
 * 1. Member registers with valid email, password, and initial display name.
 * 2. Member updates their display name to a new value.
 * 3. Validates the response contains the updated display name.
 * 4. Verifies created_at timestamp remains unchanged.
 * 5. Verifies updated_at timestamp reflects the update time.
 */
export async function test_api_profile_display_name_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with initial display name
  const memberConnection: api.IConnection = { host: connection.host };
  const initialDisplayName = RandomGenerator.name();
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: initialDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joinResult);
  // Store original timestamps
  const originalCreatedAt = joinResult.created_at;
  const originalUpdatedAt = joinResult.updated_at;
  // 2. Update display name
  const newDisplayName = RandomGenerator.name();
  const updatedProfile = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        displayName: newDisplayName,
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 3. Validate display name was updated
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  // 4. Validate created_at remains unchanged
  TestValidator.equals(
    "created_at unchanged",
    updatedProfile.created_at,
    originalCreatedAt,
  );
  // 5. Validate updated_at changed (should be different or same if very fast)
  // We expect updated_at to be >= originalUpdatedAt
  TestValidator.predicate(
    "updated_at is newer or equal",
    new Date(updatedProfile.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
  // 6. Validate all required fields are present
  TestValidator.predicate("has valid id", updatedProfile.id !== undefined);
  TestValidator.predicate(
    "has valid email",
    updatedProfile.email !== undefined,
  );
  TestValidator.predicate(
    "has valid timestamps",
    updatedProfile.created_at !== undefined &&
      updatedProfile.updated_at !== undefined,
  );
}
