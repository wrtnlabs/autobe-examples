import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit-like community post creation data for E2E testing.
 *
 * Generates a complete IREdditLikeCommunityPost.ICreate with randomized values
 * for all fields. The function supports Reddit-style posts including text posts
 * with body content, link posts with external URLs, and image posts.
 *
 * Accepts optional DeepPartial input for test-time customization of specific
 * fields. All unspecified fields are auto-generated with realistic random data.
 */
export function prepare_random_reddit_like_community_post(
  input?: DeepPartial<IREdditLikeCommunityPost.ICreate> | undefined,
): IREdditLikeCommunityPost.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    post_type:
      input?.post_type ??
      RandomGenerator.pick(["text", "link", "image"] as const),
    community_id:
      input?.community_id ?? typia.random<string & tags.Format<"uuid">>(),
    body: input?.body ?? RandomGenerator.content({ paragraphs: 2 }),
    url: input?.url ?? typia.random<string & tags.Format<"uri">>(),
  };
}
