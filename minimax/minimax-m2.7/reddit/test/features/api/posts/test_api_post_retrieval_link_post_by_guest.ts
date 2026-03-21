import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_retrieval_link_post_by_guest(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random post ID for testing
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the post as a guest (unauthenticated)
  // The endpoint is publicly accessible - no authentication required
  const post = await api.functional.redditClone.posts.at(connection, {
    postId,
  });
  // Validate the response with typia.assert() for complete runtime type validation
  typia.assert(post);
  // Validate post type discriminator is 'link'
  TestValidator.equals("type discriminator is 'link'", post.type, "link");
  // Validate linkUrl is present and contains a valid URL
  TestValidator.predicate(
    "linkUrl is present",
    post.linkUrl !== undefined && post.linkUrl !== null,
  );
  TestValidator.predicate("linkUrl is a valid URL", () => {
    if (!post.linkUrl) return false;
    try {
      new URL(post.linkUrl);
      return true;
    } catch {
      return false;
    }
  });
  // Validate title is present
  TestValidator.predicate(
    "title is present",
    post.title !== undefined && post.title.length > 0,
  );
  // Validate author information is present
  TestValidator.predicate("author is present", post.author !== undefined);
  TestValidator.predicate(
    "author username is present",
    post.author.username !== undefined && post.author.username.length > 0,
  );
  // Validate community information is present
  TestValidator.predicate("community is present", post.community !== undefined);
  TestValidator.predicate(
    "community name is present",
    post.community.name !== undefined && post.community.name.length > 0,
  );
  // Validate vote_score is present
  TestValidator.predicate(
    "vote_score is present",
    typeof post.vote_score === "number",
  );
  // Validate comment_count is present
  TestValidator.predicate(
    "comment_count is present",
    typeof post.comment_count === "number",
  );
  // Validate created_at timestamp is present and valid ISO 8601 format
  TestValidator.predicate(
    "created_at is present",
    post.created_at !== undefined && post.created_at.length > 0,
  );
  TestValidator.predicate("created_at is valid ISO 8601", () => {
    if (!post.created_at) return false;
    const date = new Date(post.created_at);
    return !isNaN(date.getTime());
  });
  // Ensure textBody and imageFileId are not present for link posts
  TestValidator.equals(
    "textBody not present for link post",
    post.textBody,
    undefined,
  );
  TestValidator.equals(
    "imageFileId not present for link post",
    post.imageFileId,
    undefined,
  );
}
