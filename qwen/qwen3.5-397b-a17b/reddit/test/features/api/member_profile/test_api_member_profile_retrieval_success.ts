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
 * Test successful retrieval of an active member's public profile.
 *
 * Creates a new member account via authorize_member_join utility function, then fetches their profile using the username via GET /redditCommunity/members/{username}. Validates that the response contains all required fields: id, username, display_name, karma, created_at, updated_at, deleted_at (null for active).
 *
 * Verifies the profile data is correctly populated from the reddit_community_user_profiles table joined with reddit_community_members. This tests the primary success path for public profile viewing accessible to both guests and members.
 *
 * 1. Create member account using authorize_member_join utility function with randomized credentials.
 * 2. Fetch the member's public profile using their username via api.functional.redditCommunity.members.getByUsername.
 * 3. Validate the profile response structure with typia.assert().
 * 4. Verify username matches the created member's username.
 * 5. Verify deleted_at is null indicating active account.
 */
export async function test_api_member_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account using utility function
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
  // 2. Fetch the member's public profile by username
  const profile = await api.functional.redditCommunity.members.getByUsername(
    memberConnection,
    {
      username: authorized.username,
    },
  );
  typia.assert(profile);
  // 3. Validate profile data matches created member
  TestValidator.equals(
    "username matches created member",
    profile.username,
    authorized.username,
  );
  // 4. Verify deleted_at is null for active account
  TestValidator.equals(
    "deleted_at is null for active account",
    profile.deleted_at,
    null,
  );
}
