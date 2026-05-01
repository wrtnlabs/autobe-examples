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
 * Test that a member's updated display name is reflected when retrieving their profile.
 *
 * Validates the end-to-end flow of editing a display name and confirming the change is visible through the profile retrieval endpoint. Ensures that the profile response correctly reflects both the new display name and that the modification timestamp has advanced beyond the account creation timestamp.
 *
 * 1. Register a new member with random credentials and capture the initial profile state.
 * 2. Edit the member's display name to a new value via the profile update endpoint.
 * 3. Retrieve the member's own profile using the memberId from registration.
 * 4. Verify the display_name in the profile response matches the newly set value.
 * 5. Verify that updated_at is more recent than created_at, confirming the modification was recorded.
 */
export async function test_api_member_profile_after_display_name_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, { body: {} });
  typia.assert(auth);
  // 2. Edit display name to a new value distinct from the original
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
  // 3. Retrieve profile using the member's own ID
  const profile = await api.functional.todoApp.members.at(memberConnection, {
    memberId: auth.id,
  });
  typia.assert(profile);
  // 4. Validate display name and timestamps
  TestValidator.equals(
    "display name updated",
    profile.display_name,
    newDisplayName,
  );
  TestValidator.predicate(
    "updated_at is more recent than created_at",
    new Date(profile.updated_at).getTime() >
      new Date(profile.created_at).getTime(),
  );
}
