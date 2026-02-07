import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPostCommentsCount } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostCommentsCount";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_comment_count_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for a post
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Call the API to retrieve comment count for the post
  const commentCount = await api.functional.community.posts.comment_count.at(
    connection,
    { postId },
  );
  // Validate the response is correctly typed
  typia.assert(commentCount);
  // Since ICommunityPostCommentsCount is an empty object type,
  // we need to use typia.random to generate a valid structure
  // that matches the expected response shape
  const expectedCount = typia.random<ICommunityPostCommentsCount>();
  // We need to verify the count is a non-negative integer
  // According to the DTO definition and scenario, we expect a count property
  // Even though the DTO is defined as {}, we need to infer the structure from
  // the function's response type and scenario description
  const actualCount = (commentCount as any).comment_count || commentCount;
  // Validate that the value is a non-negative integer
  TestValidator.predicate(
    "comment count is non-negative integer",
    typeof actualCount === "number" &&
      Number.isInteger(actualCount) &&
      actualCount >= 0,
  );
}
