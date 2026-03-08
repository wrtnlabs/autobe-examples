import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostRevision";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_revision_history_empty_and_single(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random post ID for testing
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve revision history
  const revision = await api.functional.redditLike.posts.revisions.at(
    connection,
    {
      postId: postId,
    },
  );
  typia.assert(revision!);
  // Validate the single revision structure
  TestValidator.predicate(
    "revision_number is a positive integer",
    revision.revision_number > 0,
  );
  TestValidator.predicate(
    "title is a string",
    typeof revision.title === "string",
  );
  TestValidator.predicate(
    "author is defined",
    revision.author !== null && revision.author !== undefined,
  );
  TestValidator.predicate(
    "post is defined",
    revision.post !== null && revision.post !== undefined,
  );
}
