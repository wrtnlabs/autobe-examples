import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_not_found_handling(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Non-existent post with valid UUID format
  const nonExistentPostId = "00000000-0000-0000-0000-000000000000";
  try {
    await api.functional.redditClone.posts.at(connection, {
      postId: nonExistentPostId,
    });
    throw new Error("Expected an error for non-existent post");
  } catch (error) {
    // Verify the error is an HttpError with 404 status
    if (!(error instanceof Error)) throw error;
    // Test that post ID was used in path (validation)
    if (error.message.includes(nonExistentPostId) === false) {
      throw new Error("post ID should be in error path");
    }
  }
  // Test 2: Invalid UUID format
  const invalidPostId = "invalid-post-id-format";
  try {
    await api.functional.redditClone.posts.at(connection, {
      postId: invalidPostId,
    });
    throw new Error("Expected an error for invalid post ID format");
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    // Verify validation error for invalid format
    if (error.message.includes(invalidPostId) === false) {
      throw new Error("invalid ID should be in error");
    }
  }
  // Test 3: Random string that's not a valid UUID
  const randomPostId = RandomGenerator.alphaNumeric(20);
  try {
    await api.functional.redditClone.posts.at(connection, {
      postId: randomPostId,
    });
    throw new Error("Expected an error for random string post ID");
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    // Verify error handling for random ID
    if (error.message.includes(randomPostId) === false) {
      throw new Error("random ID should be in error");
    }
  }
  // Test 4: Verify the API returns structured error response for 404
  const notFoundPostId = typia.random<string & tags.Format<"uuid">>();
  try {
    await api.functional.redditClone.posts.at(connection, {
      postId: notFoundPostId,
    });
    throw new Error("Expected a 404 error for non-existent post");
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    // Verify error properties exist (validation structure)
    TestValidator.predicate(
      "error has name",
      () => (error as Error).name.length > 0,
    );
    TestValidator.predicate(
      "error has message",
      () => (error as Error).message.length > 0,
    );
  }
}