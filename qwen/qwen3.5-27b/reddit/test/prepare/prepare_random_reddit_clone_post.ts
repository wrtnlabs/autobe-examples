import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit clone post creation data for E2E testing.
 *
 * Generates a complete IRedditClonePost.ICreate with randomized values for
 * creating posts in the Reddit-like community platform. Supports three post
 * types: text posts with body content, link posts with external URLs, and
 * image posts with image URLs.
 *
 * The function respects the post_type field to determine which content field
 * should be populated: text_content for text posts, link_url for link posts,
 * and image_url for image posts. All fields can be customized via the input
 * parameter for specific test scenarios.
 */
export function prepare_random_reddit_clone_post(
  input?: DeepPartial<IRedditClonePost.ICreate> | undefined,
): IRedditClonePost.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    post_type:
      input?.post_type ??
      RandomGenerator.pick(["text", "link", "image"] as const),
    community_id:
      input?.community_id ?? typia.random<string & tags.Format<"uuid">>(),
    text_content:
      input?.text_content ??
      (input?.post_type === "text"
        ? RandomGenerator.content({ paragraphs: 2 })
        : undefined),
    link_url:
      input?.link_url ??
      (input?.post_type === "link"
        ? typia.random<string & tags.Format<"url">>()
        : undefined),
    image_url:
      input?.image_url ??
      (input?.post_type === "image"
        ? typia.random<string & tags.Format<"url">>()
        : undefined),
  };
}
