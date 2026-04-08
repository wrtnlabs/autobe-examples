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
 * Test community retrieval after soft-delete to verify access restriction.
 *
 * Validates the soft-delete business logic by ensuring that communities marked as deleted cannot be retrieved through the public retrieval endpoint. A member creates a community, deletes it using the member delete endpoint, then attempts to retrieve it. The system should return a 404 error, confirming that soft-deleted communities are properly excluded from read operations.
 *
 * This test verifies the critical security and data integrity requirement that deleted content remains inaccessible to all users, including the original owner. The soft-delete pattern uses the deleted_at timestamp to mark communities as deleted while retaining them in the database for potential recovery.
 *
 * 1. Member authenticates via join endpoint to create an authorized session.
 * 2. Member creates a community with randomized name, description, and icon.
 * 3. Member deletes the community using the delete endpoint (soft-delete).
 * 4. Attempt to retrieve the deleted community using its ID.
 * 5. Validate that the retrieval throws an HTTP error (404 Not Found), confirming the soft-delete is enforced.
 */
export async function test_api_community_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Delete community (soft-delete)
  await api.functional.redditCommunity.member.communities.erase(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // 4 & 5. Attempt to retrieve deleted community - should throw 404
  await TestValidator.error("deleted community should return 404", async () => {
    await api.functional.redditCommunity.communities.at(memberConnection, {
      communityId: community.id,
    });
  });
}
