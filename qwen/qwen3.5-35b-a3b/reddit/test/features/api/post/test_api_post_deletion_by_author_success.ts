import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_post_deletion_by_author_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // 2. List available communities to find one to post in
  const communitiesResponse =
    await api.functional.redditCommunity.communities.index(memberConnection, {
      body: {
        limit: 10,
        page: 1,
      },
    });
  typia.assert(communitiesResponse);
  // Find a community that is not deleted
  const activeCommunity = communitiesResponse.data.find(
    (c) => c.deleted_at === null,
  );
  if (!activeCommunity) {
    throw new Error("No active communities found for testing");
  }
  // 3. Create a post in the community
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_id: activeCommunity.id,
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Verify the post exists by retrieving it
  const retrievedPost = await api.functional.redditCommunity.posts.at(
    memberConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(retrievedPost);
  // Validate post details before deletion
  TestValidator.equals("post title matches", retrievedPost.title, post.title);
  TestValidator.equals("post type matches", retrievedPost.post_type, "text");
  TestValidator.equals("vote score initial", retrievedPost.vote_score, 0);
  TestValidator.equals("comment count initial", retrievedPost.comment_count, 0);
  TestValidator.equals(
    "post not deleted initially",
    retrievedPost.deleted_at,
    null,
  );
  // 5. Delete the post
  const deletedPost = await api.functional.redditCommunity.member.posts.erase(
    memberConnection,
    {
      postId: post.id,
    },
  );
  // 6. Validate deletion response - post should be returned with deleted_at set
  const deletedResult = typia.assert<IRedditCommunityPost>(deletedPost);
  TestValidator.equals("deleted post title", deletedResult.title, post.title);
  TestValidator.predicate(
    "post marked as deleted",
    deletedResult.deleted_at !== null,
  );
  // 7. Confirm post author can see deleted post (deleted_at is set)
  const postAfterDeletion = await api.functional.redditCommunity.posts.at(
    memberConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(postAfterDeletion);
  TestValidator.equals(
    "post still retrievable by ID",
    postAfterDeletion.id,
    post.id,
  );
  TestValidator.predicate(
    "deleted_at remains set after re-fetch",
    postAfterDeletion.deleted_at !== null,
  );
  TestValidator.equals(
    "post author matches authenticated member",
    postAfterDeletion.author.id,
    retrievedPost.author.id,
  );
}
