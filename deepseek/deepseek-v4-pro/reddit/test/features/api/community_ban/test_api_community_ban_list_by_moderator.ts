import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityBan";
import type { ICommunityHubCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityModerator";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { generate_random_community_hub_member_communities_moderators_create } from "../../../generate/generate_random_community_hub_member_communities_moderators_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_community_moderator } from "../../../prepare/prepare_random_community_hub_community_moderator";

/**
 * Test that a community moderator can retrieve the ban list for their community.
 *
 * Validates the moderator authorization path for the ban list endpoint independently
 * of the owner path. Establishes a two-tier governance hierarchy where an owner creates
 * a community and appoints a second member as a regular moderator, then the moderator
 * queries the ban list without any filter parameters.
 *
 * The response is validated as a proper paginated result — even with zero bans, the
 * pagination metadata must be correct and the data array must be empty. This confirms
 * that the moderator role grants access to the ban list endpoint.
 *
 * 1. Owner authenticates and creates a community.
 * 2. A second member authenticates.
 * 3. Owner appoints the second member as a moderator of the community.
 * 4. Moderator retrieves the ban list with no filters.
 * 5. Validates pagination structure and empty data array.
 */
export async function test_api_community_ban_list_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Owner creates a community
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Authenticate the second member (future moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorMember = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderatorMember);
  // 4. Owner appoints the second member as moderator
  const moderatorRole =
    await generate_random_community_hub_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { username: moderatorMember.username },
      },
    );
  typia.assert(moderatorRole);
  // 5. Moderator retrieves the ban list with no filters
  const banList =
    await api.functional.communityHub.member.communities.bans.index(
      moderatorConnection,
      {
        communityName: community.name,
        body: {} satisfies ICommunityHubCommunityBan.IRequest,
      },
    );
  typia.assert(banList);
  // 6. Validate pagination metadata
  TestValidator.equals("pagination current", banList.pagination.current, 1);
  TestValidator.equals("pagination records", banList.pagination.records, 0);
  TestValidator.equals("pagination pages", banList.pagination.pages, 0);
  TestValidator.predicate(
    "pagination limit positive",
    banList.pagination.limit > 0,
  );
  // 7. Validate data is an empty array
  TestValidator.predicate("data is array", Array.isArray(banList.data));
  TestValidator.equals("data is empty", banList.data.length, 0);
}
