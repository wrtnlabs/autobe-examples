import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_community_update_name_duplicate_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create Community A with name "AlphaCommunity"
  const communityA = await generate_random_community_member_communities_create(
    memberConnection,
    {
      body: { name: "AlphaCommunity" },
    },
  );
  typia.assert(communityA);
  // 3. Create Community B with name "BetaCommunity"
  const communityB = await generate_random_community_member_communities_create(
    memberConnection,
    {
      body: { name: "BetaCommunity" },
    },
  );
  typia.assert(communityB);
  // 4. Attempt to update Community B with Community A's exact name - should be rejected
  await TestValidator.error("duplicate name exact match rejected", async () => {
    await api.functional.community.member.communities.update(memberConnection, {
      communityId: communityB.id,
      body: {
        name: "AlphaCommunity",
      } satisfies ICommunityCommunity.IUpdate,
    });
  });
  // 5. Attempt to update Community B with lowercase version of Community A's name - should be rejected
  await TestValidator.error(
    "duplicate name case-insensitive match rejected",
    async () => {
      await api.functional.community.member.communities.update(
        memberConnection,
        {
          communityId: communityB.id,
          body: {
            name: "alphacommunity",
          } satisfies ICommunityCommunity.IUpdate,
        },
      );
    },
  );
  // 6. Update Community B with its own current name - should succeed (idempotent self-rename)
  const updatedCommunityB =
    await api.functional.community.member.communities.update(memberConnection, {
      communityId: communityB.id,
      body: {
        name: "BetaCommunity",
      } satisfies ICommunityCommunity.IUpdate,
    });
  typia.assert(updatedCommunityB);
  TestValidator.equals(
    "community name unchanged after self-rename",
    updatedCommunityB.name,
    "BetaCommunity",
  );
}
