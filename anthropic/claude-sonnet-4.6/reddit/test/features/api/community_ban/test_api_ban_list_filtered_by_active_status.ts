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
import { generate_random_community_member_communities_bans_create } from "../../../generate/generate_random_community_member_communities_bans_create";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_ban } from "../../../prepare/prepare_random_community_ban";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_ban_list_filtered_by_active_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the community owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuthorized);
  // 2. Create a community as the owner
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Register a second member (ban target)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuthorized = await authorize_member_join(targetConnection, {});
  typia.assert(targetAuthorized);
  // 4. Issue an active ban against the second member (as owner/moderator)
  const ban = await generate_random_community_member_communities_bans_create(
    ownerConnection,
    {
      params: { communityId: community.id },
      body: {
        banned_member_id: targetAuthorized.id,
        reason: "Test ban reason for active status filter test",
      },
    },
  );
  typia.assert(ban);
  // 5. Filter by status = 'active'
  const activeBansPage =
    await api.functional.community.member.communities.bans.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          status: "active",
        } satisfies ICommunityBan.IRequest,
      },
    );
  typia.assert(activeBansPage);
  // All returned entries must have status = 'active'
  TestValidator.predicate(
    "all entries are active",
    activeBansPage.data.every((entry) => entry.status === "active"),
  );
  // No 'lifted' entries should appear
  TestValidator.predicate(
    "no lifted bans in active filter",
    !activeBansPage.data.some((entry) => entry.status === "lifted"),
  );
  // The created ban should be in the result set
  TestValidator.predicate(
    "created ban appears in active results",
    activeBansPage.data.some((entry) => entry.id === ban.id),
  );
  // Pagination records should be at least 1
  TestValidator.predicate(
    "pagination records >= 1 for active bans",
    activeBansPage.pagination.records >= 1,
  );
  // 6. Filter by status = 'lifted' (should be empty since no bans have been lifted)
  const liftedBansPage =
    await api.functional.community.member.communities.bans.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          status: "lifted",
        } satisfies ICommunityBan.IRequest,
      },
    );
  typia.assert(liftedBansPage);
  // data array should be empty
  TestValidator.predicate(
    "no lifted bans exist",
    liftedBansPage.data.length === 0,
  );
  // pagination.records should be 0
  TestValidator.predicate(
    "lifted bans pagination records is 0",
    liftedBansPage.pagination.records === 0,
  );
  // 7. Filter by bannedMemberUsername (partial match using substring)
  const targetUsername = targetAuthorized.username;
  // Use a substring of the target's username for partial matching
  const partialUsername = targetUsername.substring(
    0,
    Math.max(1, Math.floor(targetUsername.length / 2)),
  );
  const usernameBansPage =
    await api.functional.community.member.communities.bans.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          bannedMemberUsername: partialUsername,
        } satisfies ICommunityBan.IRequest,
      },
    );
  typia.assert(usernameBansPage);
  // All returned bans should have banned member username containing the partial string (case-insensitive)
  TestValidator.predicate(
    "all bans match partial username filter",
    usernameBansPage.data.every((entry) =>
      entry.bannedMember.username
        .toLowerCase()
        .includes(partialUsername.toLowerCase()),
    ),
  );
  // The created ban for the target should appear in the username-filtered results
  TestValidator.predicate(
    "created ban appears in username-filtered results",
    usernameBansPage.data.some((entry) => entry.id === ban.id),
  );
}
