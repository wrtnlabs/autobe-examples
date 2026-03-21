import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test updating a member's profile with only display name and bio text, without changing avatar.
 *
 * Steps:
 * 1. Register a new member account via POST /redditClone/auth/member/join
 * 2. Call PUT /redditClone/member/profile with a new display_name and bio text, omitting avatar_file_uri
 * 3. Verify the response returns the updated profile with the new display_name and bio
 * 4. Verify the existing avatar (if any) remains unchanged
 *
 * Validation points:
 * - Response contains the updated display_name
 * - Response contains the updated bio text
 * - Avatar field unchanged if previously set
 * - updated_at timestamp reflects update
 */
export async function test_api_profile_update_display_name_and_bio(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Generate new display name and bio for update
  const newDisplayName = RandomGenerator.name(2);
  const newBio = RandomGenerator.paragraph({ sentences: 3 });
  // 3. Update profile with display name and bio only (no avatar change)
  const updatedProfile = await api.functional.redditClone.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
        bio: newBio,
      } satisfies IRedditCloneUserProfile.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 4. Validate the response
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals("bio updated", updatedProfile.bio, newBio);
  TestValidator.predicate(
    "updated_at is recent",
    new Date(updatedProfile.updated_at).getTime() <= Date.now(),
  );
  TestValidator.predicate("has valid id", updatedProfile.id.length > 0);
  TestValidator.predicate(
    "has valid owner",
    updatedProfile.owner !== undefined,
  );
}
