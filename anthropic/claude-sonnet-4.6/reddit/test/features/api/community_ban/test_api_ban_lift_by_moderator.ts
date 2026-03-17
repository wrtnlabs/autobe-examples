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

export async function test_api_ban_lift_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A (community owner/moderator)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Create a community as member A (becomes the owner automatically)
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // 3. Register member B (the target to be banned)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. As member A (owner), issue a ban against member B
  const ban = await generate_random_community_member_communities_bans_create(
    memberAConnection,
    {
      body: {
        banned_member_id: memberB.id,
        reason: "Violation of community guidelines",
      },
      params: {
        communityId: community.id,
      },
    },
  );
  typia.assert(ban);
  // 5. As member A (owner), lift the ban via PUT endpoint
  const liftedBan =
    await api.functional.community.member.communities.bans.update(
      memberAConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          status: "lifted",
        } satisfies ICommunityBan.IUpdate,
      },
    );
  typia.assert(liftedBan);
  // Validations
  TestValidator.equals("ban status is lifted", liftedBan.status, "lifted");
  TestValidator.predicate(
    "lifted_at is non-null",
    liftedBan.lifted_at !== null,
  );
  TestValidator.equals(
    "banned member matches member B",
    liftedBan.bannedMember.id,
    memberB.id,
  );
  TestValidator.equals(
    "issuing moderator matches member A",
    liftedBan.issuingModerator.id,
    memberA.id,
  );
  TestValidator.equals(
    "community matches created community",
    liftedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "reason remains unchanged",
    liftedBan.reason,
    ban.reason,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    liftedBan.created_at,
    ban.created_at,
  );
}
