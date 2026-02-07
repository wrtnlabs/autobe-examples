import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_retrieval_schema_compliance(
  connection: api.IConnection,
): Promise<void> {
  // Generate random valid post ID
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the post using the API
  const post = await api.functional.community.posts.at(connection, { postId });
  typia.assert(post);
}
