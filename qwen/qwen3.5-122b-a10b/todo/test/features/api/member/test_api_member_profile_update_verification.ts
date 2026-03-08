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
 * Test member profile update verification workflow.
 * 1. Register a new member account with initial display name
 * 2. Retrieve initial profile to capture original state
 * 3. Update profile with a new display name
 * 4. Verify the update response immediately reflects the new display name
 * 5. Verify the updatedAt timestamp is different from the initial state
 * 6. Retrieve profile again to confirm change persists in database
 * 7. Verify all other fields remain unchanged
 */
export async function test_api_member_profile_update_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const initialDisplayName = RandomGenerator.name();
  const newDisplayName = RandomGenerator.name();
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: initialDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Retrieve initial profile
  const initialProfile = authResult;
  typia.assert(initialProfile);
  // Store initial state for comparison
  const initialId = initialProfile.id;
  const initialEmail = initialProfile.email;
  const initialCreatedAt = initialProfile.createdAt;
  const initialUpdatedAt = initialProfile.updatedAt;
  // 3. Update profile with new display name
  const updateResult = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(updateResult);
  // 4. Verify the update response immediately reflects the new display name
  TestValidator.equals(
    "display name updated immediately",
    updateResult.displayName,
    newDisplayName,
  );
  // 5. Verify the updatedAt timestamp is different from the initial state
  TestValidator.notEquals(
    "updatedAt timestamp changed",
    updateResult.updatedAt,
    initialUpdatedAt,
  );
  // 6. Verify createdAt remains unchanged
  TestValidator.equals(
    "createdAt unchanged",
    updateResult.createdAt,
    initialCreatedAt,
  );
  // 7. Verify all other fields remain unchanged
  TestValidator.equals("id unchanged", updateResult.id, initialId);
  TestValidator.equals("email unchanged", updateResult.email, initialEmail);
  TestValidator.equals(
    "deletedAt unchanged",
    updateResult.deletedAt,
    initialProfile.deletedAt,
  );
  // 8. Retrieve profile again to confirm change persists in database
  const finalProfile = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(finalProfile);
  // 9. Verify the persisted profile has the updated display name
  TestValidator.equals(
    "display name persists in database",
    finalProfile.displayName,
    newDisplayName,
  );
  TestValidator.equals("id persists unchanged", finalProfile.id, initialId);
  TestValidator.equals(
    "email persists unchanged",
    finalProfile.email,
    initialEmail,
  );
  TestValidator.equals(
    "createdAt persists unchanged",
    finalProfile.createdAt,
    initialCreatedAt,
  );
  TestValidator.equals(
    "deletedAt persists unchanged",
    finalProfile.deletedAt,
    initialProfile.deletedAt,
  );
}
