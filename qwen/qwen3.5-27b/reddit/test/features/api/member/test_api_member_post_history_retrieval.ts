import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
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
 * Test member post history retrieval with authentication and pagination.
 * 1. Register a new member account
 * 2. Create a community for the member
 * 3. Create multiple text posts in the community
 * 4. Retrieve the member's post history
 * 5. Validate response structure and pagination metadata
 * 6. Verify posts are sorted by creation date (newest first)
 */
export async function test_api_member_post_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(member);
  // 2. Create a community for the member
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      { body: undefined },
    );
  typia.assert(community);
  // 3. Create multiple text posts in the community
  const createdPosts = await ArrayUtil.asyncRepeat(3, async (index) => {
    const post = await generate_random_reddit_clone_member_posts_create(
      memberConnection,
      {
        body: {
          title: `Test Post ${index + 1}`,
          postType: "text",
          communityId: community.id,
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditClonePost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });
  // 4. Retrieve the member's post history
  const history = await api.functional.redditClone.member.me.posts.index(
    memberConnection,
    {
      body: {
        page: 1,
        page_size: 20,
        sort: "new",
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(history);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    history.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", history.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records includes created posts",
    history.pagination.records >= 3,
  );
  TestValidator.predicate(
    "pagination pages is calculated correctly",
    history.pagination.pages >= 1,
  );
  // 6. Validate posts array contains the created posts
  TestValidator.predicate(
    "posts array contains at least 3 posts",
    history.data.length >= 3,
  );
  // 7. Verify created posts appear in history
  const createdPostIds = createdPosts.map((p) => p.id);
  const retrievedPostIds = history.data.map((p) => p.id);
  const foundPosts = createdPostIds.filter((id) =>
    retrievedPostIds.includes(id),
  );
  TestValidator.predicate(
    "at least some created posts appear in history",
    foundPosts.length >= 1,
  );
  // 8. Verify each post summary structure and business logic
  await ArrayUtil.asyncForEach(history.data.slice(0, 3), async (post) => {
    typia.assert(post);
    // Verify author matches the authenticated member
    TestValidator.equals("author id matches member", post.author.id, member.id);
    TestValidator.equals(
      "author username matches member",
      post.author.username,
      member.username,
    );
    // Verify community matches the created community
    TestValidator.equals(
      "community id matches",
      post.community.id,
      community.id,
    );
    // Verify post_type is valid
    TestValidator.predicate(
      "post_type is valid",
      post.post_type === "text" ||
        post.post_type === "link" ||
        post.post_type === "image",
    );
    // Verify score is valid int32 (starts at 0 for new posts)
    TestValidator.predicate(
      "score is valid int32",
      Number.isInteger(post.score) && post.score >= 0,
    );
    // Verify comment_count is valid int32 (starts at 0 for new posts)
    TestValidator.predicate(
      "comment_count is valid int32",
      Number.isInteger(post.comment_count) && post.comment_count >= 0,
    );
  });
  // 9. Verify posts are sorted by creation date (newest first)
  if (history.data.length >= 2) {
    const firstPost = history.data[0];
    const secondPost = history.data[1];
    TestValidator.predicate(
      "posts sorted by created_at descending",
      new Date(firstPost.created_at).getTime() >=
        new Date(secondPost.created_at).getTime(),
    );
  }
}
