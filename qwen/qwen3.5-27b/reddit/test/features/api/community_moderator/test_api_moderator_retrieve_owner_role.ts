import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test retrieving the community owner's moderator assignment details.
 * 1. Authenticate a member who will create and own the community
 * 2. Create a community which automatically assigns the creator as owner moderator
 * 3. Retrieve the owner's moderator assignment details
 * 4. Validate that the role is 'owner' and all details are correct
 */
export async function test_api_moderator_retrieve_owner_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member who will create and own the community
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(member);
  // 2. Create a community (automatically assigns creator as owner moderator)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: undefined,
      },
    );
  typia.assert(community);
  // 3. Retrieve the owner's moderator assignment details
  const moderator =
    await api.functional.redditClone.member.communities.moderators.at(
      memberConnection,
      {
        communityId: community.name,
        moderatorId: member.id,
      },
    );
  typia.assert(moderator);
  // 4. Validate moderator role is 'owner'
  TestValidator.equals("moderator role is owner", moderator.role, "owner");
  // 5. Validate community details are correctly joined
  TestValidator.equals(
    "community id matches",
    moderator.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    moderator.community.name,
    community.name,
  );
  // 6. Validate member details match the community creator
  TestValidator.equals("member id matches", moderator.member.id, member.id);
  TestValidator.equals(
    "member username matches",
    moderator.member.username,
    member.username,
  );
  // 7. Validate timestamps are present
  TestValidator.predicate(
    "created_at exists",
    moderator.created_at !== null && moderator.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    moderator.updated_at !== null && moderator.updated_at !== undefined,
  );
  // 8. Validate deleted_at is null (active assignment)
  TestValidator.equals("deleted_at is null", moderator.deleted_at, null);
}
