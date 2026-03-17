import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_partial_update_semantics(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test partial update semantics where only provided fields are updated.
   *
   * 1. Register a new member account
   * 2. Initially set profile with both display_name and bio
   * 3. Update only display_name (omit bio)
   * 4. Verify display_name changed, bio unchanged
   * 5. Verify updated_at timestamp reflects the update
   */
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Set initial profile with both display_name and bio
  const initialDisplayName = "First Display Name";
  const initialBio = "First bio";
  const initialProfile =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: initialDisplayName,
          bio: initialBio,
        } satisfies ICommunityPlatformMember.IUpdate,
      },
    );
  typia.assert(initialProfile);
  // Verify initial values were set
  TestValidator.equals(
    "initial display_name",
    initialProfile.displayName,
    initialDisplayName,
  );
  TestValidator.equals("initial bio", initialProfile.bio, initialBio);
  // Store the initial updated_at for comparison
  const initialUpdatedAt = initialProfile.updatedAt;
  // 3. Update only display_name (bio omitted - partial update)
  const updatedDisplayName = "Updated Name";
  const updatedProfile =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: updatedDisplayName,
          // bio is intentionally omitted to test partial update semantics
        } satisfies ICommunityPlatformMember.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 4. Verify display_name was updated
  TestValidator.equals(
    "display_name updated",
    updatedProfile.displayName,
    updatedDisplayName,
  );
  // 5. Verify bio remained unchanged (partial update semantics)
  TestValidator.equals("bio unchanged", updatedProfile.bio, initialBio);
  // 6. Verify updated_at timestamp reflects the latest update
  TestValidator.notEquals(
    "updated_at changed",
    updatedProfile.updatedAt,
    initialUpdatedAt,
  );
}
