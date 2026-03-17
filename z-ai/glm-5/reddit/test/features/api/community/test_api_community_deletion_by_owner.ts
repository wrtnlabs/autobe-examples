import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

/**
 * Test successful community deletion by the community owner.
 * 1. Register and authenticate as a new member who will become the community owner
 * 2. Create a new community (creator becomes owner automatically)
 * 3. Delete the community as the owner
 * 4. Verify deletion completes successfully (void response)
 * 5. Verify attempting to delete again results in an error (community not found)
 */
export async function test_api_community_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create a new community (creator becomes owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: `test-community-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Delete the community as the owner
  await api.functional.communityPlatform.member.communities.erase(
    ownerConnection,
    {
      communityId: community.id,
    },
  );
  // 4. Verify deletion by attempting to delete again (should fail - community not found)
  await TestValidator.error(
    "deleted community should not be found for re-deletion",
    async () =>
      await api.functional.communityPlatform.member.communities.erase(
        ownerConnection,
        {
          communityId: community.id,
        },
      ),
  );
}
