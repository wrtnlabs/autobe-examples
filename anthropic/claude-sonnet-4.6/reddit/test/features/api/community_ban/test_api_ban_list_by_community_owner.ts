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

export async function test_api_ban_list_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the community owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerMember = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerMember);
  // 2. Create a community (owner is automatically set to the joining member)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Register a second member who will be the target of the ban
  const targetConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetConnection, {});
  typia.assert(targetMember);
  // 4. Issue a ban against the second member
  const ban = await generate_random_community_member_communities_bans_create(
    ownerConnection,
    {
      params: { communityId: community.id },
      body: {
        banned_member_id: targetMember.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(ban);
  // 5. Call the target endpoint with default (empty) body — list bans as owner
  const banPage = await api.functional.community.member.communities.bans.index(
    ownerConnection,
    {
      communityId: community.id,
      body: {} satisfies ICommunityBan.IRequest,
    },
  );
  typia.assert(banPage);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination.records >= 1",
    banPage.pagination.records >= 1,
  );
  TestValidator.equals("pagination.current", banPage.pagination.current, 1);
  TestValidator.predicate(
    "data has at least one entry",
    banPage.data.length >= 1,
  );
  // 7. Validate the specific ban appears in the list
  const foundBan = banPage.data.find((b) => b.id === ban.id);
  TestValidator.predicate("ban found in list", foundBan !== undefined);
  if (foundBan !== undefined) {
    TestValidator.equals(
      "bannedMember.id matches target member",
      foundBan.bannedMember.id,
      targetMember.id,
    );
    TestValidator.equals(
      "issuingModerator.id matches owner",
      foundBan.issuingModerator.id,
      ownerMember.id,
    );
    TestValidator.equals("ban status is active", foundBan.status, "active");
    TestValidator.equals("lifted_at is null", foundBan.lifted_at, null);
  }
  // 8. Test with explicit pagination parameters (page=1, limit=10)
  const banPageExplicit =
    await api.functional.community.member.communities.bans.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityBan.IRequest,
      },
    );
  typia.assert(banPageExplicit);
  TestValidator.equals(
    "explicit pagination current page",
    banPageExplicit.pagination.current,
    1,
  );
  TestValidator.equals(
    "explicit pagination limit",
    banPageExplicit.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "explicit pagination records >= 1",
    banPageExplicit.pagination.records >= 1,
  );
  // pages = ceil(records / limit)
  const expectedPages = Math.ceil(
    banPageExplicit.pagination.records / banPageExplicit.pagination.limit,
  );
  TestValidator.equals(
    "explicit pagination pages",
    banPageExplicit.pagination.pages,
    expectedPages,
  );
}
