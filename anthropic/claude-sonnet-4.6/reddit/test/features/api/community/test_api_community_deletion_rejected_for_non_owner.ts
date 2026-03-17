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

export async function test_api_community_deletion_rejected_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate the owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create a community owned by the owner member
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Register and authenticate the non-owner member
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(nonOwnerConnection, {});
  // 4. Attempt to delete the community using the non-owner's connection
  // Expect a 403 Forbidden error
  await TestValidator.httpError(
    "non-owner cannot delete community",
    403,
    async () => {
      await api.functional.community.member.communities.erase(
        nonOwnerConnection,
        {
          communityId: community.id,
        },
      );
    },
  );
}
