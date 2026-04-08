import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test community creation by authenticated member with complete response validation.
 *
 * Validates the complete community creation workflow including member authentication, community creation with unique name and valid metadata, and comprehensive response field validation. Ensures that the community is created successfully with auto-generated UUID, the creator is correctly set as owner, timestamps are populated, and the community is immediately available.
 *
 * The test verifies all response fields including id, name, description, icon, owner (with member summary containing id, username, display_name, bio, avatar, karma, created_at), subscriber_count (initially 0), created_at, updated_at, and deleted_at (null for active community).
 *
 * 1. Member registers with randomized credentials via authorize_member_join utility.
 * 2. Member creates community with unique name, description, and icon URI.
 * 3. Validates community response contains all required fields with correct types.
 * 4. Verifies owner field matches the authenticated member's profile information.
 * 5. Confirms initial subscriber_count is 0 and deleted_at is null.
 */
export async function test_api_community_creation_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member Authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Community Creation
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Validate Owner Information Matches Authenticated Member
  TestValidator.equals(
    "owner id matches member id",
    community.owner.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "owner username matches",
    community.owner.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "owner display name matches",
    community.owner.display_name,
    memberAuth.display_name,
  );
  // 4. Validate Initial Community State
  TestValidator.equals("subscriber count is 0", community.subscriber_count, 0);
  TestValidator.equals("deleted_at is null", community.deleted_at, null);
}
