import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test complete profile update where a member updates all profile fields in a single request.
 *
 * Validates the complete profile update flow including member registration, authentication, and updating all three profile fields (display_name, bio, and avatar_url) atomically. Ensures that the profile correctly reflects all submitted values while preserving immutable fields.
 *
 * Special attention is given to verifying that optional fields (bio, avatar_url) accept string values when provided, karma score remains unchanged from initial registration, and timestamps are managed correctly with updated_at changing while created_at stays fixed.
 *
 * 1. Member registers with email, password, and username via authorize_member_join utility.
 * 2. Member calls PUT /redditCommunity/member/profile with all three fields: display_name, bio, and avatar_url.
 * 3. Validates response contains updated profile with all new values matching input.
 * 4. Verifies karma score remains unchanged from registration response.
 * 5. Verifies updated_at timestamp is later than created_at timestamp.
 * 6. Verifies id, username, created_at, and deleted_at remain unchanged from registration.
 */
export async function test_api_profile_update_complete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authorized);
  // Store initial values for comparison
  const initialKarma = authorized.karma;
  const initialId = authorized.id;
  const initialUsername = authorized.username;
  // 2. Prepare profile update data with all three fields
  const updateData = {
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityUserProfile.IUpdate;
  // 3. Update profile with all fields
  const updatedProfile =
    await api.functional.redditCommunity.member.profile.update(
      memberConnection,
      {
        body: updateData,
      },
    );
  typia.assert(updatedProfile);
  // 4. Verify all profile fields match submitted values
  TestValidator.equals(
    "display_name matches",
    updatedProfile.display_name,
    updateData.display_name,
  );
  TestValidator.equals("bio matches", updatedProfile.bio, updateData.bio);
  TestValidator.equals(
    "avatar_url matches",
    updatedProfile.avatar_url,
    updateData.avatar_url,
  );
  // 5. Verify karma score remains unchanged
  TestValidator.equals("karma unchanged", updatedProfile.karma, initialKarma);
  // 6. Verify immutable fields remain unchanged
  TestValidator.equals("id unchanged", updatedProfile.id, initialId);
  TestValidator.equals(
    "username unchanged",
    updatedProfile.username,
    initialUsername,
  );
  TestValidator.equals("deleted_at is null", updatedProfile.deleted_at, null);
  // 7. Verify timestamp management - updated_at is later than created_at
  TestValidator.predicate(
    "updated_at is later than created_at",
    new Date(updatedProfile.updated_at).getTime() >
      new Date(updatedProfile.created_at).getTime(),
  );
}
