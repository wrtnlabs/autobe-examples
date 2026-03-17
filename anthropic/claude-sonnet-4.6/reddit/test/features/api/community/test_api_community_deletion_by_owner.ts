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

export async function test_api_community_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member-specific connection and register/authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a new community using the authenticated member connection
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // Validate the community was created and is active (deleted_at should be null)
  TestValidator.equals(
    "community is active before deletion",
    community.deleted_at,
    null,
  );
  // Step 3: Delete the community owned by the member
  await api.functional.community.member.communities.erase(memberConnection, {
    communityId: community.id,
  });
  // Step 4: Validate irreversibility - attempting to delete again should fail (404)
  await TestValidator.error(
    "second deletion should fail with error",
    async () => {
      await api.functional.community.member.communities.erase(
        memberConnection,
        {
          communityId: community.id,
        },
      );
    },
  );
}
