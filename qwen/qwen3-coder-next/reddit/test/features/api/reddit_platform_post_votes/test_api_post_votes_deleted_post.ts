import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_votes_deleted_post(
  connection: api.IConnection,
): Promise<void> {
  // The provided SDK only exposes the votes endpoint
  // We cannot create posts or perform soft-deletes with the available functions
  //
  // Scenario adaptation:
  // Test that the votes endpoint can handle any postId, including non-existent ones
  // and verify the response type is IRedditPlatformPostVote.IStat
  // Test with a random postId - the endpoint should return valid IStat type
  const postId = typia.random<string & tags.Format<"uuid">>();
  const stats = await api.functional.redditPlatform.posts.votes.at(connection, {
    postId: postId,
  });
  // Validate the response is of correct type (empty IStat object)
  typia.assert(stats);
  // Since IStat is an empty object type, we verify it has no unexpected properties
  const statProperties = Object.keys(stats);
  TestValidator.equals("IStat has no properties", statProperties.length, 0);
}
