import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
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
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

/**
 * Test community owner retrieving the list of banned users.
 *
 * This test verifies the primary success path where a community owner
 * retrieves the ban list for their community. The flow includes:
 * 1. Owner authenticates and creates a community (becoming owner with moderator privileges)
 * 2. Owner requests the ban list for that community
 * 3. Validate response structure with pagination metadata and data array
 */
export async function test_api_community_ban_list_owner_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner connection and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create community as owner (automatically becomes owner with moderator privileges)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Request ban list as owner with default parameters
  const banList = await api.functional.community.member.communities.bans.index(
    ownerConnection,
    {
      communityName: community.name,
      body: {} satisfies ICommunityBan.IRequest,
    },
  );
  typia.assert(banList);
  // 4. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has valid current page",
    banList.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    banList.pagination.limit >= 1 && banList.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination has non-negative records",
    banList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative pages",
    banList.pagination.pages >= 0,
  );
  // 5. Validate data array structure
  TestValidator.predicate("data is an array", Array.isArray(banList.data));
  TestValidator.equals(
    "data length matches records when empty",
    banList.data.length,
    banList.pagination.records,
  );
  // 6. Verify empty ban list for newly created community
  TestValidator.equals(
    "new community has no bans",
    banList.pagination.records,
    0,
  );
  TestValidator.equals("empty data array", banList.data.length, 0);
}
