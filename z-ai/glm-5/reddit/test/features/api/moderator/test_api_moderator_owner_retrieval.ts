import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
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

export async function test_api_moderator_owner_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ICommunityMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {},
  );
  typia.assert(memberAuth);
  // Step 2: Create community (creator becomes owner-moderator)
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Retrieve owner's moderator record using owner's member ID
  // The moderatorId parameter is the member ID of the moderator
  const moderator = await api.functional.community.communities.moderators.at(
    memberConnection,
    {
      communityName: community.name,
      moderatorId: community.owner.id,
    },
  );
  typia.assert(moderator);
  // Step 4: Verify moderator record properties
  // Verify is_owner flag is true (community creator)
  TestValidator.equals("is_owner should be true", moderator.is_owner, true);
  // Verify moderator record ID is valid UUID
  TestValidator.predicate(
    "moderator id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderator.id,
    ),
  );
  // Verify created_at timestamp is valid date-time
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(moderator.created_at)),
  );
  // Verify member profile matches community owner
  TestValidator.equals(
    "member id matches owner",
    moderator.member.id,
    community.owner.id,
  );
  TestValidator.equals(
    "member username matches owner",
    moderator.member.username,
    community.owner.username,
  );
  TestValidator.equals(
    "member displayName matches owner",
    moderator.member.displayName,
    community.owner.displayName,
  );
  // Verify appointer is null for owners (designated automatically)
  TestValidator.equals(
    "appointer should be null for owner",
    moderator.appointer,
    null,
  );
  // Verify created_at is close to community creation time (within 1 second)
  const communityCreatedAt = new Date(community.createdAt).getTime();
  const moderatorCreatedAt = new Date(moderator.created_at).getTime();
  TestValidator.predicate(
    "created_at matches community creation time",
    Math.abs(communityCreatedAt - moderatorCreatedAt) < 1000,
  );
}
