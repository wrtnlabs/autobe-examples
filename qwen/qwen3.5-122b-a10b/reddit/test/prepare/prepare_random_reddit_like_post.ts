import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit-like post creation data for E2E testing.
 *
 * Generates a complete IRedditLikePost.ICreate with randomized values based on
 * content type. Supports text posts (with content_text), link posts (with content_url),
 * and image posts (no content fields, image uploaded via multipart/form-data).
 *
 * @param input Optional partial input to override random values
 * @returns Complete IRedditLikePost.ICreate object
 */
export function prepare_random_reddit_like_post(
  input?: DeepPartial<IRedditLikePost.ICreate>,
): IRedditLikePost.ICreate {
  const contentType =
    input?.content_type ??
    RandomGenerator.pick(["text", "link", "image"] as const);
  return {
    community_id:
      input?.community_id ?? typia.random<string & tags.Format<"uuid">>(),
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    content_type: contentType,
    content_text:
      input?.content_text ??
      (contentType === "text"
        ? RandomGenerator.content({ paragraphs: 2 })
        : undefined),
    content_url:
      input?.content_url ??
      (contentType === "link"
        ? typia.random<string & tags.Format<"uri">>()
        : undefined),
  };
}
