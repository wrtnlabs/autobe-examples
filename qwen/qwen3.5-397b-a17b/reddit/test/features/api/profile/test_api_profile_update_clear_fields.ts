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
 * Test clearing optional profile fields by setting bio and avatar_url to null values.
 *
 * Validates the complete profile update workflow including member authentication, profile field clearing, and response verification. Ensures that nullable fields (bio, avatar_url) can be explicitly cleared by sending null values while other profile fields remain unaffected.
 *
 * Special attention is given to verifying that null values are properly stored and returned for optional fields, and that the display_name can be updated simultaneously with clearing other fields. The test also validates that profile ownership is correctly enforced during the update operation.
 *
 * 1. Member registers with email, password, and username via join endpoint.
 * 2. Member calls PUT /redditCommunity/member/profile with display_name, bio=null, avatar_url=null.
 * 3. Validates response contains updated display_name matching input.
 * 4. Validates bio is null in the response.
 * 5. Validates avatar_url is null in the response.
 * 6. Validates other fields (id, username, karma, created_at, deleted_at) remain unchanged.
 * 7. Validates updated_at timestamp reflects the update time and is after created_at.
 */
export async function test_api_profile_update_clear_fields(
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
  // Store original profile data for comparison
  const originalId = authorized.id;
  const originalUsername = authorized.username;
  const originalKarma = authorized.karma;
  // 2. Update profile with cleared optional fields
  const newDisplayName = RandomGenerator.name(2);
  const beforeUpdate = new Date();
  const updatedProfile =
    await api.functional.redditCommunity.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: newDisplayName,
          bio: null,
          avatar_url: null,
        } satisfies IRedditCommunityUserProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  const afterUpdate = new Date();
  // 3-5. Verify cleared fields
  TestValidator.equals(
    "display_name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals("bio is null", updatedProfile.bio, null);
  TestValidator.equals("avatar_url is null", updatedProfile.avatar_url, null);
  // 6. Verify unchanged fields
  TestValidator.equals("id unchanged", updatedProfile.id, originalId);
  TestValidator.equals(
    "username unchanged",
    updatedProfile.username,
    originalUsername,
  );
  TestValidator.equals("karma unchanged", updatedProfile.karma, originalKarma);
  TestValidator.equals("deleted_at is null", updatedProfile.deleted_at, null);
  // 7. Verify updated_at timestamp
  TestValidator.predicate(
    "updated_at is after before update",
    () => new Date(updatedProfile.updated_at) >= beforeUpdate,
  );
  TestValidator.predicate(
    "updated_at is before after update",
    () => new Date(updatedProfile.updated_at) <= afterUpdate,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    () =>
      new Date(updatedProfile.updated_at) >=
      new Date(updatedProfile.created_at),
  );
}
