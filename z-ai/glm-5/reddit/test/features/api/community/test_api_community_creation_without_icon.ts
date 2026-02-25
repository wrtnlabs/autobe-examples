import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

/**
 * Test successful community creation with minimal required fields (no icon_url).
 *
 * This test validates that icon_url is truly optional and the system handles null correctly.
 *
 * Steps:
 * 1. Register a new member account via POST /community/auth/member/join
 * 2. Create a community providing only required fields: unique name and description
 * 3. Verify the response contains: generated UUID id, correct name and description,
 *    iconUrl is null, subscriber_count = 1, owner field contains the authenticated member's summary
 * 4. Verify timestamps are populated correctly
 */
export async function test_api_community_creation_without_icon(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create community with only required fields (no icon_url)
  const communityName = RandomGenerator.alphaNumeric(10);
  const communityDescription = RandomGenerator.paragraph({ sentences: 5 });
  const createBody = {
    name: communityName,
    description: communityDescription,
  } satisfies ICommunityCommunity.ICreate;
  const community = await api.functional.community.member.communities.create(
    memberConnection,
    {
      body: createBody,
    },
  );
  typia.assert(community);
  // 3. Verify response contains correct data
  TestValidator.equals("community name", community.name, communityName);
  TestValidator.equals(
    "community description",
    community.description,
    communityDescription,
  );
  TestValidator.equals("iconUrl is null", community.iconUrl, null);
  TestValidator.equals("subscriber count is 1", community.subscriberCount, 1);
  // 4. Verify owner matches the authenticated member
  TestValidator.equals("owner id", community.owner.id, member.id);
  TestValidator.equals(
    "owner username",
    community.owner.username,
    member.username,
  );
  // 5. Verify timestamps are populated
  TestValidator.predicate("createdAt is valid", () => {
    const createdAt = new Date(community.createdAt);
    return !isNaN(createdAt.getTime()) && createdAt <= new Date();
  });
  TestValidator.predicate("updatedAt is valid", () => {
    const updatedAt = new Date(community.updatedAt);
    return !isNaN(updatedAt.getTime()) && updatedAt <= new Date();
  });
  TestValidator.equals("deletedAt is null", community.deletedAt, null);
}
