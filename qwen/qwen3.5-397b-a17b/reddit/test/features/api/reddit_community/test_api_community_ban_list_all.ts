import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBan";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
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
 * Test retrieving all bans in a community with pagination metadata.
 *
 * Validates the complete ban list retrieval flow including member authentication, community creation, and paginated ban list access. Ensures that the community owner can retrieve ban records with proper pagination structure and that each ban record contains all required fields.
 *
 * Special attention is given to verifying that the pagination metadata is correctly structured with current page, limit, total records, and total pages. The response structure must conform to IPageIRedditCommunityBan.ISummary schema.
 *
 * 1. Member registers and authenticates as community owner.
 * 2. Community is created with valid name, description, and icon.
 * 3. Ban list is retrieved without filters (empty ban list for new community).
 * 4. Validates pagination metadata structure and values.
 * 5. Validates response schema matches IPageIRedditCommunityBan.ISummary.
 */
export async function test_api_community_ban_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member who will own the community
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create a community owned by the authenticated member
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Retrieve ban list without filters (new community has no bans)
  const banList =
    await api.functional.redditCommunity.member.communities.bans.index(
      memberConnection,
      {
        communityId: community.id,
        body: {} satisfies IRedditCommunityBan.IRequest,
      },
    );
  typia.assert(banList);
  // 4. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination exists",
    banList.pagination !== undefined,
  );
  TestValidator.equals("current page", banList.pagination.current, 1);
  TestValidator.predicate("limit is positive", banList.pagination.limit > 0);
  TestValidator.equals(
    "total records for new community",
    banList.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages for empty list",
    banList.pagination.pages,
    0,
  );
  // 5. Validate data array exists and is empty for new community
  TestValidator.predicate("data array exists", Array.isArray(banList.data));
  TestValidator.equals("no bans in new community", banList.data.length, 0);
}
