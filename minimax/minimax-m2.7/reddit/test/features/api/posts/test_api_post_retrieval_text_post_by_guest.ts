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

export async function test_api_post_retrieval_text_post_by_guest(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving a text post as an unauthenticated guest user
  // This endpoint is publicly accessible, so we use the base connection directly
  const post = await api.functional.redditClone.posts.at(connection, {
    postId: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(post);
  // Validate type discriminator indicates text post
  TestValidator.equals("type discriminator", post.type, "text");
  // Validate textBody is present for text post
  TestValidator.predicate("textBody exists", post.textBody !== undefined);
  TestValidator.predicate(
    "textBody is non-empty",
    (post.textBody?.length ?? 0) > 0,
  );
  // Validate required fields are present
  TestValidator.predicate("title exists", post.title !== undefined);
  TestValidator.predicate("title is non-empty", post.title.length > 0);
  TestValidator.predicate("author exists", post.author !== undefined);
  TestValidator.predicate(
    "author username exists",
    post.author.username !== undefined,
  );
  TestValidator.predicate("community exists", post.community !== undefined);
  TestValidator.predicate(
    "community name exists",
    post.community.name !== undefined,
  );
  TestValidator.predicate("vote_score exists", post.vote_score !== undefined);
  TestValidator.predicate(
    "comment_count exists",
    post.comment_count !== undefined,
  );
  TestValidator.predicate("created_at exists", post.created_at !== undefined);
  // Validate field types
  TestValidator.equals(
    "vote_score is integer",
    typeof post.vote_score,
    "number",
  );
  TestValidator.equals(
    "comment_count is integer",
    typeof post.comment_count,
    "number",
  );
  TestValidator.equals(
    "created_at is string",
    typeof post.created_at,
    "string",
  );
  TestValidator.equals("textBody is string", typeof post.textBody, "string");
}
