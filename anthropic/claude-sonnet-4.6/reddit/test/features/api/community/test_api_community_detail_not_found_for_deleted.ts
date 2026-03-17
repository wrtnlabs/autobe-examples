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

export async function test_api_community_detail_not_found_for_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community using the generation utility
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Verify the community is accessible before deletion
  const fetched = await api.functional.community.communities.at(
    memberConnection,
    { communityId: community.id },
  );
  typia.assert(fetched);
  TestValidator.equals("community id matches", fetched.id, community.id);
  // 4. Delete (soft-delete) the community
  await api.functional.community.member.communities.erase(memberConnection, {
    communityId: community.id,
  });
  // 5 & 6. Verify that accessing the deleted community returns 404
  await TestValidator.httpError(
    "deleted community should return 404",
    404,
    async () => {
      await api.functional.community.communities.at(memberConnection, {
        communityId: community.id,
      });
    },
  );
  // 7, 8 & 9. Verify that accessing a non-existent UUID also returns 404
  const guestConnection: api.IConnection = { host: connection.host };
  const randomUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent community UUID should return 404",
    404,
    async () => {
      await api.functional.community.communities.at(guestConnection, {
        communityId: randomUUID,
      });
    },
  );
}
