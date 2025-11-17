import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

/**
 * Tests deletion of a RedditCommunity post by its author.
 *
 * This test covers the entire user flow:
 *
 * 1. Register a new RedditCommunity registered user.
 * 2. Create a new community by the registered user.
 * 3. Create a new post in that community.
 * 4. Delete the post by its author.
 *
 * It validates that post deletion is restricted to the owner, and the delete
 * operation completes successfully without error.
 */
export async function test_api_redditcommunity_registereduser_post_deletion_by_author(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: `user_${RandomGenerator.alphabets(6)}@example.com`,
        password: "Password123!",
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    });
  typia.assert(user);

  // 2. Create a new community
  const communityName = `comm_${RandomGenerator.alphabets(8)}`;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      {
        body: {
          communityName: communityName satisfies string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-z0-9_-]+$">,
          displayName: `Community ${RandomGenerator.name(2)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
          imageUrl: null,
          isPrivate: false,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create a post inside the community
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.create(
      connection,
      {
        body: {
          reddit_community_community_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          type: "text",
          title: `Post Title ${RandomGenerator.paragraph({ sentences: 1 })}`,
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);

  // 4. Delete the post by author
  await api.functional.redditCommunity.registeredUser.redditCommunity.posts.erase(
    connection,
    {
      postId: post.id,
    },
  );
}
