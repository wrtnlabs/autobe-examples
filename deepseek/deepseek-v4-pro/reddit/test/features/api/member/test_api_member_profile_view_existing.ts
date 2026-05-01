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
 * Test that a registered member's public profile is accessible and returns all expected fields.
 *
 * Validates the basic happy path for profile retrieval by registering a new member and then fetching their public profile by username. Confirms the public profile visibility rule — no authentication is required, and the endpoint is accessible to anyone.
 *
 * 1. Register a new member via join with randomized credentials.
 * 2. Retrieve the member's profile by username through the public endpoint.
 * 3. Validate all public profile fields match expectations: id, username, display_name, bio (null), avatar_uri (null), karma (0), created_at (ISO 8601), posts (empty array), comments (empty array).
 */
export async function test_api_member_profile_view_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const joinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(joinConnection, {});
  typia.assert(member);
  // 2. Retrieve profile by username (public endpoint, no auth required)
  const profile = await api.functional.communityHub.members.at(connection, {
    username: member.username,
  });
  typia.assert(profile);
  // 3. Validate profile fields
  TestValidator.equals("id matches", profile.id, member.id);
  TestValidator.equals("username matches", profile.username, member.username);
  TestValidator.equals(
    "display_name matches",
    profile.display_name,
    member.display_name,
  );
  TestValidator.equals("bio is null for new member", profile.bio, null);
  TestValidator.equals(
    "avatar_uri is null for new member",
    profile.avatar_uri,
    null,
  );
  TestValidator.equals("karma starts at 0", profile.karma, 0);
  TestValidator.predicate(
    "created_at is a valid ISO 8601 timestamp",
    !isNaN(Date.parse(profile.created_at)),
  );
  TestValidator.predicate(
    "posts array is empty for new member",
    profile.posts.length === 0,
  );
  TestValidator.predicate(
    "comments array is empty for new member",
    profile.comments.length === 0,
  );
}
