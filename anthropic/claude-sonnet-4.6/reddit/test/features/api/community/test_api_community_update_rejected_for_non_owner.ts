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

export async function test_api_community_update_rejected_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A (the owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Create a community as Member A
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // 3. Register Member B (non-owner)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 4. Member B attempts to update the community — must be rejected
  await TestValidator.error("non-owner update rejected", async () => {
    await api.functional.community.member.communities.update(
      memberBConnection,
      {
        communityId: community.id,
        body: {
          name: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies ICommunityCommunity.IUpdate,
      },
    );
  });
  // 5. Member A (owner) can still successfully update the community
  const updatedCommunity =
    await api.functional.community.member.communities.update(
      memberAConnection,
      {
        communityId: community.id,
        body: {
          name: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies ICommunityCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);
  // 6. Validate the update was applied by the owner
  TestValidator.equals(
    "owner update applied",
    updatedCommunity.id,
    community.id,
  );
}
