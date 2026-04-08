import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member profile update with all editable fields.
 *
 * Validates the complete profile update flow for a Reddit-like community platform member. This test ensures that a member can successfully update their display name, bio text, and avatar image through the profile update endpoint.
 *
 * The test verifies that all editable fields are properly persisted and that system-managed fields like karma score, member information, and timestamps remain intact during the update operation.
 *
 * 1. Authenticate as a member via join operation
 * 2. Prepare profile update data with new display_name, bio, and avatar
 * 3. Call the profile update endpoint with the prepared data
 * 4. Validate the response contains all updated fields
 * 5. Verify updated_at timestamp reflects the modification
 * 6. Confirm karma_score and member information are preserved
 */
export async function test_api_profile_update_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Prepare profile update data with all editable fields
  const updateData = {
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 5 }),
    avatar: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditLikeUserProfile.IUpdate;
  // 3. Call profile update endpoint
  const originalUpdatedAt = authorized.updated_at;
  const updatedProfile = await api.functional.redditLike.member.profile.update(
    memberConnection,
    {
      body: updateData,
    },
  );
  typia.assert(updatedProfile);
  // 4. Validate updated fields
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    updateData.display_name,
  );
  TestValidator.equals("bio updated", updatedProfile.bio, updateData.bio);
  TestValidator.equals(
    "avatar updated",
    updatedProfile.avatar,
    updateData.avatar,
  );
  // 5. Verify updated_at timestamp is updated
  TestValidator.predicate(
    "updated_at timestamp changed",
    new Date(updatedProfile.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
  // 6. Confirm preserved fields
  TestValidator.equals(
    "karma score preserved",
    updatedProfile.karma_score,
    authorized.karma_score,
  );
  TestValidator.equals(
    "member id preserved",
    updatedProfile.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "member username preserved",
    updatedProfile.member.username,
    authorized.username,
  );
  TestValidator.equals(
    "created_at preserved",
    updatedProfile.created_at,
    authorized.created_at,
  );
}
