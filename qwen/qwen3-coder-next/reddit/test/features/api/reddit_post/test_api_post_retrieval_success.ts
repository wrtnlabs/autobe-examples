import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random post ID for testing
  const testPostId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the post using the available endpoint
  const retrieved = await api.functional.redditPlatform.posts.at(connection, {
    postId: testPostId,
  });
  // Validate the retrieved post structure
  typia.assert(retrieved);
  // Verify the post has required properties
  TestValidator.predicate(
    "post has valid ID",
    /^[0-9a-f-]{36}$/i.test(retrieved.id),
  );
  TestValidator.predicate(
    "title exists",
    retrieved.title !== undefined &&
      retrieved.title !== null &&
      retrieved.title.length > 0,
  );
  TestValidator.predicate(
    "type is valid",
    ["TEXT", "LINK", "IMAGE"].includes(retrieved.type),
  );
  TestValidator.predicate(
    "author exists",
    retrieved.author !== undefined && retrieved.author !== null,
  );
  TestValidator.predicate(
    "community exists",
    retrieved.community !== undefined && retrieved.community !== null,
  );
  // Validate author structure
  TestValidator.predicate(
    "author has valid ID",
    /^[0-9a-f-]{36}$/i.test(retrieved.author.id),
  );
  TestValidator.predicate(
    "author has username",
    retrieved.author.username !== undefined &&
      retrieved.author.username !== null &&
      retrieved.author.username.length > 0,
  );
  // Validate community structure
  TestValidator.predicate(
    "community has valid ID",
    /^[0-9a-f-]{36}$/i.test(retrieved.community.id),
  );
  TestValidator.predicate(
    "community has name",
    retrieved.community.name !== undefined &&
      retrieved.community.name !== null &&
      retrieved.community.name.length > 0,
  );
  // Validate numeric fields
  TestValidator.predicate(
    "voteScore is valid number",
    typeof retrieved.voteScore === "number" && retrieved.voteScore >= 0,
  );
  TestValidator.predicate(
    "commentCount is valid number",
    typeof retrieved.commentCount === "number" && retrieved.commentCount >= 0,
  );
}
