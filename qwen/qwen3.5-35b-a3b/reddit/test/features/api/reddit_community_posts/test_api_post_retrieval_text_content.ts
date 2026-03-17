import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_retrieval_text_content(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid text post UUID for retrieval
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the post details using the post ID
  const post = await api.functional.redditCommunity.posts.at(connection, {
    postId,
  });
  typia.assert(post);
  // Validate post_type is 'text'
  TestValidator.equals("post type is text", post.post_type, "text");
  // Validate content contains text-specific fields
  if (post.content.post_type === "text") {
    typia.assert(post.content);
    TestValidator.predicate("has body content", post.content.body.length > 0);
  }
  // Validate vote_score is 0 (no votes cast)
  TestValidator.equals("vote score is 0", post.vote_score, 0);
  // Validate comment_count is 0 (no comments)
  TestValidator.equals("comment count is 0", post.comment_count, 0);
  // Validate deleted_at is null (active post)
  TestValidator.equals("post is not deleted", post.deleted_at, null);
  // Validate author object exists with username
  typia.assert(post.author);
  TestValidator.predicate(
    "author has username",
    post.author.username.length > 0,
  );
  // Validate community object exists with name
  typia.assert(post.community);
  TestValidator.predicate("community has name", post.community.name.length > 0);
}
