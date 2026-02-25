import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_moderators_create } from "../../../generate/generate_random_community_member_communities_moderators_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_moderator } from "../../../prepare/prepare_random_community_moderator";

/**
 * Test that an appointed moderator (non-owner) can successfully retrieve the ban list.
 *
 * This test verifies that a moderator who was appointed by the community owner
 * (i.e., is_owner=false) has the same access to the ban list as the owner.
 * The specification states that "Only community owners and appointed moderators
 * can access this list."
 *
 * Test Flow:
 * 1. Register an owner member who will create the community
 * 2. Create a community (owner is automatically subscribed and becomes owner-moderator)
 * 3. Register a second member who will be appointed as moderator
 * 4. Appoint the second member as moderator using owner's authority
 * 5. Verify the appointed moderator can access the ban list
 * 6. Validate response structure and pagination
 */
export async function test_api_community_ban_list_appointed_moderator_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create owner connection and register owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      username: `owner_${RandomGenerator.alphaNumeric(8)}`,
    },
  });
  typia.assert(ownerAuth);
  // Step 2: Create community as owner
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {
      body: {
        name: `community_${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(community);
  // Verify owner is correctly set
  TestValidator.equals(
    "community owner matches",
    community.owner.id,
    ownerAuth.id,
  );
  // Step 3: Create second member (to be appointed as moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
    },
  });
  typia.assert(moderatorAuth);
  // Step 4: Appoint the second member as moderator (is_owner: false)
  const moderator =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityName: community.name,
        },
        body: {
          member_username: moderatorAuth.username,
        },
      },
    );
  typia.assert(moderator);
  // Verify the appointed moderator is not the owner
  TestValidator.equals("moderator is not owner", moderator.is_owner, false);
  TestValidator.equals(
    "moderator member matches",
    moderator.member.id,
    moderatorAuth.id,
  );
  // Step 5: Access ban list as appointed moderator
  const banList = await api.functional.community.member.communities.bans.index(
    moderatorConnection,
    {
      communityName: community.name,
      body: {
        page: 1,
        limit: 20,
      } satisfies ICommunityBan.IRequest,
    },
  );
  typia.assert(banList);
  // Step 6: Validate response structure
  TestValidator.predicate("pagination exists", banList.pagination !== null);
  TestValidator.predicate("data is array", Array.isArray(banList.data));
  TestValidator.predicate(
    "current page is 1",
    banList.pagination.current === 1,
  );
  TestValidator.predicate("limit is 20", banList.pagination.limit === 20);
  // Verify empty ban list for new community
  TestValidator.equals(
    "ban list is empty for new community",
    banList.data.length,
    0,
  );
  TestValidator.equals("records count is 0", banList.pagination.records, 0);
  TestValidator.equals("pages count is 0", banList.pagination.pages, 0);
}
