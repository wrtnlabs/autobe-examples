import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member profile update with display name and bio.
 * 1. Register member via join
 * 2. Update profile with new display name and bio
 * 3. Validate changes persisted correctly
 * 4. Verify updated_at timestamp refreshed
 */
export async function test_api_member_profile_update_with_display_name_and_bio(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(joinResult);
  // Store original profile data
  const originalDisplayName = joinResult.display_name;
  const originalBio = joinResult.bio;
  const originalUpdatedAt = joinResult.updated_at;
  // 2. Prepare update payload with new values
  const newDisplayName = RandomGenerator.name(3);
  const newBio = RandomGenerator.paragraph({ sentences: 5 });
  const updateBody = {
    displayName: newDisplayName,
    bio: newBio,
  } satisfies IDiscussionBoardMember.IUpdate;
  // 3. Update profile
  const updatedProfile =
    await api.functional.discussionBoard.member.profile.update(
      memberConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);
  // 4. Validate changes
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals("bio updated", updatedProfile.bio, newBio);
  TestValidator.notEquals(
    "updated_at changed",
    updatedProfile.updated_at,
    originalUpdatedAt,
  );
  TestValidator.predicate(
    "updated_at is newer",
    updatedProfile.updated_at > originalUpdatedAt,
  );
  TestValidator.equals(
    "ban status active",
    updatedProfile.ban_status,
    "active",
  );
  TestValidator.equals("member ID preserved", updatedProfile.id, joinResult.id);
}
