import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test that a non-owner member cannot update another member's community.
 *
 * Validates the authorization boundary that only community owners can modify community metadata. The test creates two separate member accounts, has the first member create a community, then attempts to update that community using the second member's authentication. The system must reject this attempt with a 403 forbidden error.
 *
 * This test ensures that community ownership is properly enforced at the API level, preventing unauthorized members from modifying communities they do not own. The test verifies both the authentication isolation between members and the ownership validation logic.
 *
 * 1. First member authenticates via join endpoint with unique credentials.
 * 2. First member creates a community using the authenticated connection.
 * 3. Second member authenticates via join endpoint with different credentials.
 * 4. Second member attempts to PUT update the first member's community.
 * 5. System validates ownership and rejects with 403 forbidden error.
 */
export async function test_api_community_update_non_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member (owner) authenticates
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Owner creates a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Second member (non-owner) authenticates
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(nonOwnerConnection, {});
  // 4. Non-owner attempts to update the community (should fail with 403)
  await TestValidator.httpError("non-owner update forbidden", 403, async () => {
    await api.functional.redditCommunity.member.communities.update(
      nonOwnerConnection,
      {
        communityId: community.id,
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.IUpdate,
      },
    );
  });
}
