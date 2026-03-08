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

export async function test_api_community_creation_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the successful creation of a new community by an authenticated member.
   *
   * Flow:
   * 1. Register and authenticate as a member
   * 2. Create a community with specific name, description, and optional icon
   * 3. Validate all response fields match expectations
   */
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {});
  typia.assert(authResult);
  // 2. Prepare community creation data
  const communityName = `tech_community_${RandomGenerator.alphaNumeric(8)}`;
  const communityDescription = RandomGenerator.paragraph({ sentences: 5 });
  const communityIcon = typia.random<string & tags.Format<"url">>();
  const createBody = {
    name: communityName,
    description: communityDescription,
    icon: communityIcon,
  } satisfies ICommunityPlatformCommunity.ICreate;
  // 3. Create the community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      { body: createBody },
    );
  typia.assert(community);
  // 4. Validate response fields
  TestValidator.equals("name matches", community.name, communityName);
  TestValidator.equals(
    "description matches",
    community.description,
    communityDescription,
  );
  TestValidator.equals("icon matches", community.icon, communityIcon);
  TestValidator.equals(
    "subscriber_count initialized to 0",
    community.subscriberCount,
    0,
  );
  TestValidator.equals("deleted_at is null", community.deletedAt, null);
  // 5. Validate owner matches authenticated member
  TestValidator.equals("owner id matches", community.owner.id, authResult.id);
  TestValidator.equals(
    "owner username matches",
    community.owner.username,
    authResult.username,
  );
  TestValidator.equals(
    "owner display_name matches",
    community.owner.display_name,
    authResult.displayName,
  );
  // 6. Validate timestamps are recent (within last minute)
  const now = new Date();
  const createdAt = new Date(community.createdAt);
  const updatedAt = new Date(community.updatedAt);
  TestValidator.predicate(
    "created_at is recent",
    now.getTime() - createdAt.getTime() < 60000,
  );
  TestValidator.predicate(
    "updated_at is recent",
    now.getTime() - updatedAt.getTime() < 60000,
  );
}
