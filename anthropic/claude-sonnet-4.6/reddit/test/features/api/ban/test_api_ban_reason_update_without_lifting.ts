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

export async function test_api_ban_reason_update_without_lifting(
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
  const initialBan =
    await generate_random_community_member_communities_bans_create(
      memberAConnection,
      {
        params: { communityId: community.id },
        body: {
          banned_member_id: memberB.id,
          reason: "Initial reason",
        },
      },
    );
  typia.assert(initialBan);
  // 5. As member A, update only the reason (no status change)
  const updatedBan =
    await api.functional.community.member.communities.bans.update(
      memberAConnection,
      {
        communityId: community.id,
        banId: initialBan.id,
        body: {
          reason: "Updated reason — repeated rule violation",
        } satisfies ICommunityBan.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // Validations
  TestValidator.equals(
    "reason updated",
    updatedBan.reason,
    "Updated reason — repeated rule violation",
  );
  TestValidator.equals("status remains active", updatedBan.status, "active");
  TestValidator.equals("lifted_at remains null", updatedBan.lifted_at, null);
  TestValidator.equals(
    "bannedMember id unchanged",
    updatedBan.bannedMember.id,
    initialBan.bannedMember.id,
  );
  TestValidator.equals(
    "issuingModerator id unchanged",
    updatedBan.issuingModerator.id,
    initialBan.issuingModerator.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedBan.created_at,
    initialBan.created_at,
  );
  TestValidator.equals("ban id unchanged", updatedBan.id, initialBan.id);
}
