import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
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
 * Test that an authenticated member can successfully update their profile with all available fields (display_name, bio, and avatar).
 *
 * Validates the complete profile update workflow including member registration, authentication, and profile modification with all three optional fields. Ensures that the profile correctly reflects the updated display name, bio text, and avatar URL.
 *
 * Special attention is given to verifying that all submitted fields are correctly persisted and returned in the response, including the karma score and timestamps.
 *
 * 1. Register a new member account with email, password, and username using authorize_member_join utility.
 * 2. Create a new connection for the authenticated member using the same host.
 * 3. Update the profile with all three fields: display_name, bio, and avatar URL.
 * 4. Validate the response contains the complete IRedditCloneUserProfile entity with all fields.
 * 5. Verify that display_name, bio, and avatar match the submitted values.
 * 6. Verify that karma score is included and posts/comments arrays are present.
 */
export async function test_api_profile_update_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create profile update data with all fields
  const updateBody = {
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    avatar: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCloneUserProfile.IUpdate;
  // 3. Update profile with all fields
  const profile = await api.functional.redditClone.member.profile.update(
    memberConnection,
    { body: updateBody },
  );
  typia.assert(profile);
  // 4. Validate that all fields match submitted values
  TestValidator.equals(
    "display_name matches submitted value",
    profile.display_name,
    updateBody.display_name,
  );
  TestValidator.equals(
    "bio matches submitted value",
    profile.bio,
    updateBody.bio,
  );
  TestValidator.equals(
    "avatar matches submitted value",
    profile.avatar,
    updateBody.avatar,
  );
  // 5. Validate that karma score is included (may be 0 for new user)
  TestValidator.predicate("karma score is present", profile.karma >= 0);
  // 6. Validate that posts and comments arrays are included
  TestValidator.predicate(
    "posts array is present",
    Array.isArray(profile.posts),
  );
  TestValidator.predicate(
    "comments array is present",
    Array.isArray(profile.comments),
  );
  // 7. Validate that timestamps are present
  TestValidator.predicate(
    "created_at timestamp is present",
    profile.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp is present",
    profile.updated_at !== undefined,
  );
}
