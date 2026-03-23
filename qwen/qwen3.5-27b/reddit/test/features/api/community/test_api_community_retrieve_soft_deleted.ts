import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test retrieving a soft-deleted community returns 404 Not Found.
 *
 * This test verifies that when a community is soft-deleted (deleted_at is set),
 * the public endpoint GET /redditClone/communities/{communityId} correctly
 * returns a 404 Not Found error, ensuring deleted communities are not accessible.
 */
export async function test_api_community_retrieve_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: undefined,
  });
  // 2. Create a community
  const community: IRedditCloneCommunity =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: undefined,
      },
    );
  typia.assert(community);
  // 3. Delete the community (as the owner)
  await api.functional.redditClone.member.communities.erase(memberConnection, {
    communityId: community.id,
  });
  // 4. Verify that retrieving the deleted community returns 404
  await TestValidator.httpError(
    "soft-deleted community returns 404",
    404,
    async () =>
      await api.functional.redditClone.communities.at(memberConnection, {
        communityId: community.id,
      }),
  );
}
