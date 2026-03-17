import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
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
 * Test successful community creation by an authenticated member.
 *
 * Verifies that:
 * 1. An authenticated member can create a community with unique name and description
 * 2. The creator is automatically set as the owner
 * 3. Subscriber count is initialized to zero
 * 4. All response fields are properly populated
 */
export async function test_api_community_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Prepare community creation data with unique name
  const communityBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  // 3. Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      { body: communityBody },
    );
  typia.assert(community);
  // 4. Validate community fields match input
  TestValidator.equals(
    "name matches input",
    community.name,
    communityBody.name,
  );
  TestValidator.equals(
    "description matches input",
    community.description,
    communityBody.description,
  );
  // 5. Validate initial state
  TestValidator.equals(
    "subscriber count is zero",
    community.subscriberCount,
    0,
  );
  TestValidator.predicate("icon is null", community.icon === null);
  TestValidator.predicate("community is active", community.deletedAt === null);
  // 6. Validate owner matches authenticated member
  TestValidator.equals(
    "owner id matches member",
    community.owner.id,
    member.id,
  );
  TestValidator.equals(
    "owner username matches member",
    community.owner.username,
    member.username,
  );
}
