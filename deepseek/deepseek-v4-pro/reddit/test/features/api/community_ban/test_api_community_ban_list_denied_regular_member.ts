import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityBan";
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
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";

/**
 * Test that a regular member without governance role is denied access to the community ban list.
 *
 * Validates the authorization boundary that only community owners and moderators can review the ban history of a community. A regular authenticated member who holds no governance role — neither owner nor moderator — attempting to access the ban list endpoint must receive a 403 Forbidden response.
 *
 * The test establishes two independent members: Member A creates and owns a community, while Member B authenticates separately without being granted any moderation privileges. Member B's attempt to call the ban list endpoint is expected to fail with 403.
 *
 * 1. Member A authenticates via join and creates a community, becoming its owner.
 * 2. Member B authenticates independently with no governance role in the community.
 * 3. Member B attempts to access the community's ban list.
 * 4. The request is rejected with 403 Forbidden, confirming only governance members may review moderation history.
 */
export async function test_api_community_ban_list_denied_regular_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member A (community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Member A creates a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Authenticate as member B (regular member, no governance role)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 4. Member B attempts to access the ban list → expect 403 Forbidden
  await TestValidator.httpError(
    "regular member cannot access ban list",
    403,
    async () => {
      await api.functional.communityHub.member.communities.bans.index(
        memberBConnection,
        {
          communityName: community.name,
          body: {} satisfies ICommunityHubCommunityBan.IRequest,
        },
      );
    },
  );
}
