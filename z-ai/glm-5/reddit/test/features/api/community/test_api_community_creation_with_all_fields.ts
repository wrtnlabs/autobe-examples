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
 * Test successful community creation with all fields including name, description, and icon_url.
 * Steps:
 * 1. Register a new member account via POST /community/auth/member/join
 * 2. Create a community with a unique name (3-21 alphanumeric chars), description (10-500 chars), and a valid icon URL
 * 3. Verify the response contains: generated UUID id, correct name and description, icon_url matches input, subscriber_count = 1, owner field contains the authenticated member's summary (id, username, displayName, karma, etc.), createdAt and updatedAt timestamps
 * 4. Verify the creator is automatically assigned as owner with full moderation privileges
 * 5. Verify the creator is auto-subscribed to the community
 */
export async function test_api_community_creation_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Prepare community creation data with all fields
  const communityName = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<21> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const communityDescription = RandomGenerator.paragraph({ sentences: 10 });
  const iconUrl = "https://example.com/community-icon.png";
  const createBody = {
    name: communityName,
    description: communityDescription,
    icon_url: iconUrl,
  } satisfies ICommunityCommunity.ICreate;
  // 3. Create the community
  const community = await api.functional.community.member.communities.create(
    memberConnection,
    { body: createBody },
  );
  typia.assert(community);
  // 4. Validate response fields match input
  TestValidator.equals("community name", community.name, communityName);
  TestValidator.equals(
    "community description",
    community.description,
    communityDescription,
  );
  TestValidator.equals("icon URL", community.iconUrl, iconUrl);
  // 5. Validate auto-subscription (creator is first subscriber)
  TestValidator.equals("subscriber count", community.subscriberCount, 1);
  // 6. Validate owner is the creator
  TestValidator.equals("owner ID", community.owner.id, member.id);
  TestValidator.equals(
    "owner username",
    community.owner.username,
    member.username,
  );
  // 7. Validate timestamps are present
  TestValidator.predicate(
    "createdAt is valid date-time",
    new Date(community.createdAt).getTime() > 0,
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    new Date(community.updatedAt).getTime() > 0,
  );
  // 8. Validate community is not deleted
  TestValidator.equals("deletedAt is null", community.deletedAt, null);
}
