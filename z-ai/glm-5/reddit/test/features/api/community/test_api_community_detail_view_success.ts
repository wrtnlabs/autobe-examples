import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

/**
 * Test successful retrieval of community details by an unauthenticated guest user.
 * This validates the core use case of community discovery and exploration.
 *
 * Steps:
 * 1. A member creates a community with a specific name, description, and optional icon
 * 2. An unauthenticated user (guest) requests the community by its exact name
 * 3. Verify the response contains all expected fields
 * 4. Verify the owner object contains member summary
 * 5. Verify subscriber_count is 0 initially (no subscriptions yet)
 */
export async function test_api_community_detail_view_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member who will own the community
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Fetch community using unauthenticated (guest) connection
  const guestConnection: api.IConnection = { host: connection.host };
  const fetchedCommunity =
    await api.functional.communityPlatform.communities.at(guestConnection, {
      communityName: community.name,
    });
  typia.assert(fetchedCommunity);
  // 4. Verify all community fields match
  TestValidator.equals("id", fetchedCommunity.id, community.id);
  TestValidator.equals("name", fetchedCommunity.name, community.name);
  TestValidator.equals(
    "description",
    fetchedCommunity.description,
    community.description,
  );
  TestValidator.equals("icon", fetchedCommunity.icon, community.icon);
  TestValidator.equals(
    "subscriberCount is 0",
    fetchedCommunity.subscriberCount,
    0,
  );
  TestValidator.equals(
    "createdAt",
    fetchedCommunity.createdAt,
    community.createdAt,
  );
  TestValidator.equals(
    "updatedAt",
    fetchedCommunity.updatedAt,
    community.updatedAt,
  );
  TestValidator.equals("deletedAt is null", fetchedCommunity.deletedAt, null);
  // 5. Verify owner information matches the member who created the community
  TestValidator.equals(
    "owner.id",
    fetchedCommunity.owner.id,
    memberAuth.member.id,
  );
  TestValidator.equals(
    "owner.username",
    fetchedCommunity.owner.username,
    memberAuth.member.username,
  );
  TestValidator.equals(
    "owner.display_name",
    fetchedCommunity.owner.display_name,
    memberAuth.member.display_name,
  );
  TestValidator.equals(
    "owner.bio",
    fetchedCommunity.owner.bio,
    memberAuth.member.bio,
  );
  TestValidator.equals(
    "owner.avatar_url",
    fetchedCommunity.owner.avatar_url,
    memberAuth.member.avatar_url,
  );
  TestValidator.equals(
    "owner.karma",
    fetchedCommunity.owner.karma,
    memberAuth.member.karma,
  );
  TestValidator.equals(
    "owner.created_at",
    fetchedCommunity.owner.created_at,
    memberAuth.member.created_at,
  );
}
