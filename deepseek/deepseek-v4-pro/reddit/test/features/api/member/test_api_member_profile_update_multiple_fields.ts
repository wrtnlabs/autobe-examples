import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
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
 * Test updating multiple profile fields — display_name and bio — in a single PATCH request.
 *
 * Verifies that an authenticated member can modify both their display name and biography text simultaneously through the profile update endpoint. After registration, the member's display_name defaults to the username and bio is null — this test provides new values for both fields and confirms they are persisted correctly.
 *
 * Special attention is given to verifying that fields not included in the update request remain unchanged: the username (immutable system identifier), karma (reputation score), created_at (account creation timestamp), and avatar_uri (profile image) must all match their initial post-registration values, confirming the endpoint applies only the explicitly provided fields.
 *
 * 1. Member registers and authenticates via join, capturing initial profile state.
 * 2. New display_name and bio values are generated.
 * 3. Member updates profile with both display_name and bio in one PATCH request.
 * 4. Validates updated fields reflect new values and untouched fields remain at their initial state.
 */
export async function test_api_member_profile_update_multiple_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  const initialUsername = authorized.username;
  const initialAvatarUri = authorized.avatar_uri;
  const initialKarma = authorized.karma;
  const initialCreatedAt = authorized.created_at;
  // 2. Prepare updated profile fields distinct from initial values
  const newDisplayName = RandomGenerator.name(1);
  const newBio = RandomGenerator.paragraph({ sentences: 3 });
  // 3. Update profile with both display_name and bio
  const updated = await api.functional.communityHub.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
        bio: newBio,
      } satisfies ICommunityHubMember.IUpdate,
    },
  );
  typia.assert(updated);
  // 4. Validate updated fields
  TestValidator.equals(
    "display_name updated",
    updated.display_name,
    newDisplayName,
  );
  TestValidator.equals("bio updated", updated.bio, newBio);
  // 5. Validate unchanged fields
  TestValidator.equals("username unchanged", updated.username, initialUsername);
  TestValidator.equals("karma unchanged", updated.karma, initialKarma);
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    initialCreatedAt,
  );
  TestValidator.equals(
    "avatar_uri unchanged",
    updated.avatar_uri,
    initialAvatarUri,
  );
}
