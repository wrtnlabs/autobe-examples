import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_comment_thread_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create a comment using a valid UUID
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the comment
  const result = await api.functional.redditPlatform.comments.at(connection, {
    commentId: commentId,
  });
  typia.assert(result);
  // Basic validation - IRedditPlatformComment is defined as empty object
  TestValidator.predicate("response is object", typeof result === "object");
}
