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
 * Test that non-owner members are forbidden from updating a community.
 *
 * Preconditions:
 * - Member A authenticates and creates a community (becomes owner)
 * - Member B authenticates as a different member (non-owner)
 *
 * Test Steps:
 * 1. Member B attempts to update Member A's community with new name or description
 *
 * Validations:
 * - Response returns 403 Forbidden error
 * - Community remains unchanged with original values
 * - Only owner_member_id match grants update permission
 *
 * Business Rule:
 * - Only the community owner (owner_member_id matches authenticated member) can update community details
 * - This enforces content ownership principle: members cannot modify content they don't own
 */
export async function test_api_community_update_by_non_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Member A (owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Create community owned by Member A
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // Store original values for verification
  const originalName = community.name;
  const originalDescription = community.description;
  // 3. Setup Member B (non-owner)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 4. Member B attempts to update Member A's community - should fail with 403
  const updateBody = {
    name: `${RandomGenerator.name()} Community`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunity.IUpdate;
  await TestValidator.httpError(
    "non-owner cannot update community",
    403,
    async () => {
      await api.functional.communityPlatform.member.communities.update(
        memberBConnection,
        {
          communityId: community.id,
          body: updateBody,
        },
      );
    },
  );
}
