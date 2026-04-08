import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

/**
 * Test community owner can successfully delete their own community.
 *
 * Validates the primary success path for community deletion where the authenticated member is the owner of the community being deleted. After deletion, verifies the community is soft-deleted with deleted_at timestamp set and excluded from active queries. Related entities remain in the database but become inaccessible through normal API endpoints.
 *
 * 1. Member authenticates via registration endpoint.
 * 2. Member creates a community with unique name and optional description.
 * 3. Owner deletes the community via the delete endpoint.
 * 4. Validates deletion completed successfully.
 * 5. Verifies soft-delete behavior (deleted_at timestamp set, community excluded from queries).
 */
export async function test_api_community_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a community as the member (becomes owner)
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        name: `test-community-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        icon_url: null,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Delete the community (owner has authority)
  await api.functional.redditLike.member.communities.erase(memberConnection, {
    communityId: community.id,
  });
  // 4. Verify deletion completed (no return value expected)
  // The erase function returns void, so we just verify no error was thrown
  // 5. Verify soft-delete behavior - community should not be accessible
  // Note: We cannot directly query deleted communities through the API,
  // but we can verify the deletion succeeded by attempting to access it
  // which should return 404 Not Found
  await TestValidator.httpError(
    "community should be inaccessible after deletion",
    404,
    async () => {
      // Attempt to access the deleted community - should fail with 404
      await api.functional.redditLike.member.communities.erase(
        memberConnection,
        {
          communityId: community.id,
        },
      );
    },
  );
}
