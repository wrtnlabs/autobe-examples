import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test retrieving a non-existent post snapshot returns 404 Not Found.
 *
 * This test validates that the post snapshot retrieval endpoint properly handles
 * requests for snapshots that do not exist in the system. It sets up a valid
 * member, community, and post to ensure the environment is properly configured,
 * then attempts to retrieve a snapshot with an invalid UUID to verify the
 * endpoint returns an appropriate 404 error response.
 */
export async function test_api_post_snapshot_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Create a community owned by the member
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in that community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "text",
        communityId: community.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Generate a snapshot by updating the post (if update API exists)
  // Note: The test setup creates a post, which should automatically generate
  // at least one snapshot. We don't need to explicitly update it.
  // 5. Construct a request with a deliberately invalid UUID for snapshotId
  const invalidSnapshotId = "00000000-0000-0000-0000-000000000000";
  // 6. Call GET /redditClone/post-snapshots/{snapshotId} with the invalid snapshot ID
  // 7. Verify the response returns HTTP 404 Not Found status code
  await TestValidator.httpError(
    "non-existent snapshot returns 404",
    404,
    async () =>
      await api.functional.redditClone.post_snapshots.at(memberConnection, {
        snapshotId: invalidSnapshotId as string & tags.Format<"uuid">,
      }),
  );
  // 8. Verify the endpoint handles non-existent resources gracefully
  // The httpError validator above confirms the 404 response
  // 9. Confirm that no authentication is required to receive the 404 error
  // Create an unauthenticated connection
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // The endpoint should return 404 even without authentication
  await TestValidator.httpError(
    "non-existent snapshot returns 404 without auth",
    404,
    async () =>
      await api.functional.redditClone.post_snapshots.at(
        unauthenticatedConnection,
        {
          snapshotId: invalidSnapshotId as string & tags.Format<"uuid">,
        },
      ),
  );
}
