import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
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
import { generate_random_community_member_communities_bans_create } from "../../../generate/generate_random_community_member_communities_bans_create";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_ban } from "../../../prepare/prepare_random_community_ban";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_ban_lift_already_lifted_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A (community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Create a community as member A
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // 3. Register member B (target to be banned)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. As member A, issue a ban against member B
  const ban = await generate_random_community_member_communities_bans_create(
    memberAConnection,
    {
      params: { communityId: community.id },
      body: { banned_member_id: memberB.id },
    },
  );
  typia.assert(ban);
  // Step 1: First lift - should succeed with HTTP 200
  const liftedBan =
    await api.functional.community.member.communities.bans.update(
      memberAConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: { status: "lifted" } satisfies ICommunityBan.IUpdate,
      },
    );
  typia.assert(liftedBan);
  TestValidator.equals(
    "ban status is lifted after first lift",
    liftedBan.status,
    "lifted",
  );
  TestValidator.predicate(
    "lifted_at is not null after first lift",
    liftedBan.lifted_at !== null,
  );
  // Step 2: Second lift attempt - should return 409 Conflict
  await TestValidator.httpError(
    "duplicate lift attempt returns 409 conflict",
    409,
    async () => {
      await api.functional.community.member.communities.bans.update(
        memberAConnection,
        {
          communityId: community.id,
          banId: ban.id,
          body: { status: "lifted" } satisfies ICommunityBan.IUpdate,
        },
      );
    },
  );
}
