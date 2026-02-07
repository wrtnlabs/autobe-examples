import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_votes_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Retrieve vote statistics for a valid post
  const stats = await api.functional.redditPlatform.posts.votes.at(connection, {
    postId: typia.random<string>(),
  });
  typia.assert(stats);
}
