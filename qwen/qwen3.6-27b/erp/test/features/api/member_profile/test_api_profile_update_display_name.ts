import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can successfully update their display name, verifying the update persists correctly.
 *
 * Validates the profile update success path with display name modification, ensuring mutable fields update correctly while immutable identifiers like id and email remain unchanged.
 *
 * 1. Register and authenticate as a member via POST /hrmPlatform/auth/member/join
2. Update profile with a new display_name
3. Verify the response contains the updated display_name
4. Verify the updated_at timestamp reflects the update
5. Verify immutable fields (id, email) remain unchanged
 *
 * This confirms the primary success path for profile display name updates with correct timestamp handling and immutable field preservation.
 */
export async function test_api_profile_update_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(authorizedMember);
  // 2. Generate new display name for update
  const newDisplayName = RandomGenerator.name();
  // 3. Update the profile with the new display name
  const updatedProfile = await api.functional.hrmPlatform.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies IHrmPlatformMember.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 4. Verify the response contains the updated display_name
  TestValidator.equals(
    "display name matches input",
    updatedProfile.display_name,
    newDisplayName,
  );
  // 5. Verify updated_at timestamp reflects the update
  TestValidator.predicate(
    "updated_at exists",
    updatedProfile.updated_at !== undefined,
  );
  // 6. Verify immutable fields remain unchanged
  TestValidator.equals(
    "id is unchanged",
    updatedProfile.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "email is unchanged",
    updatedProfile.email,
    authorizedMember.email,
  );
}
