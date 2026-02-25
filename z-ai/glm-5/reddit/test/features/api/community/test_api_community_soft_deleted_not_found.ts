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
 * Test that a soft-deleted community returns 404 Not Found.
 *
 * This test validates the soft-delete business rule where deleted communities
 * are excluded from query results (WHERE deleted_at IS NULL). Once a community
 * is soft-deleted, it should be completely hidden from public discovery,
 * returning the same 404 response as a non-existent community.
 *
 * Flow:
 * 1. Create a member account (becomes community owner)
 * 2. Create a new community
 * 3. Verify community is accessible before deletion
 * 4. Delete the community (soft delete sets deleted_at timestamp)
 * 5. Attempt to retrieve community - should return 404 Not Found
 */
export async function test_api_community_soft_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account who will become the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create a new community
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Verify community is accessible before deletion
  const communityBeforeDelete = await api.functional.community.communities.at(
    connection,
    {
      communityName: community.name,
    },
  );
  typia.assert(communityBeforeDelete);
  TestValidator.equals(
    "community accessible before deletion",
    communityBeforeDelete.name,
    community.name,
  );
  // 4. Delete the community (soft delete - sets deleted_at timestamp)
  await api.functional.community.member.communities.erase(ownerConnection, {
    communityName: community.name,
  });
  // 5. Attempt to retrieve the deleted community - should return 404 Not Found
  await TestValidator.httpError(
    "soft-deleted community should return 404",
    404,
    async () =>
      await api.functional.community.communities.at(connection, {
        communityName: community.name,
      }),
  );
}
