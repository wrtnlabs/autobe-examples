import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommentFull } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentFull";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPostWithComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostWithComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_retrieval_public_active(
  connection: api.IConnection,
): Promise<void> {
  // Generate random post ID
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Call the endpoint to retrieve the post with comment hierarchy
  const post = await api.functional.redditCommunity.posts.at(connection, {
    postId,
  });
  // Validate the entire response structure using typia.assert() - this validates all types, formats, and structure
  typia.assert(post);
}
