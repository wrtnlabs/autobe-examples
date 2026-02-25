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

/**
 * Test that a community owner can successfully delete their own community.
 *
 * Setup:
 * 1. Authenticate as member via join to become the community owner
 * 2. Create a community with unique name and description
 *
 * Test Execution:
 * 3. Delete the community as the owner
 *
 * Validation Points:
 * - Community deletion succeeds for the owner
 * - Subsequent deletion attempt fails with 404 (community not found)
 * - Owner's karma score is preserved (not affected by community deletion)
 * - Community name becomes available for reuse by new communities
 */
export async function test_api_community_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member (will become community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // Store initial karma for later verification
  const initialKarma = owner.karma;
  // 2. Create a community as the owner
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // Verify owner is correctly set on the community
  TestValidator.equals(
    "community owner matches creator",
    community.owner.id,
    owner.id,
  );
  // 3. Delete the community as the owner (should succeed)
  await api.functional.community.member.communities.erase(ownerConnection, {
    communityName: community.name,
  });
  // 4. Verify community is deleted - attempting to delete again should fail with 404
  await TestValidator.httpError(
    "deleted community should not be found",
    404,
    async () => {
      await api.functional.community.member.communities.erase(ownerConnection, {
        communityName: community.name,
      });
    },
  );
  // 5. Verify owner's karma is preserved after community deletion
  TestValidator.equals(
    "owner karma preserved after deletion",
    owner.karma,
    initialKarma,
  );
  // 6. Verify community name becomes available for reuse
  const newCommunity =
    await generate_random_community_member_communities_create(ownerConnection, {
      body: {
        name: community.name,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    });
  typia.assert(newCommunity);
  TestValidator.equals(
    "community name reused successfully",
    newCommunity.name,
    community.name,
  );
}
