import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit community post creation data for E2E testing.
 *
 * Generates a complete IRedditCommunityPost.ICreate with randomized values. All properties support test-time customization through the optional input parameter using DeepPartial semantics.
 *
 * The post_type field determines which content field is semantically required: 'text' posts use body, 'link' posts use url, and 'image' posts use image_url. This function generates all optional fields to support various test scenarios.
 *
 * @param input - Optional partial input for test customization. All properties are optional and will be auto-generated if not provided.
 * @returns Complete IRedditCommunityPost.ICreate object with all required and optional fields populated.
 */
export function prepare_random_reddit_community_post(
  input?: DeepPartial<IRedditCommunityPost.ICreate>,
): IRedditCommunityPost.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    post_type:
      input?.post_type ??
      RandomGenerator.pick(["text", "link", "image"] as const),
    community_id:
      input?.community_id ?? typia.random<string & tags.Format<"uuid">>(),
    body:
      input?.body ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 3,
        sentenceMax: 5,
      }),
    url: input?.url ?? typia.random<string & tags.Format<"uri">>(),
    image_url: input?.image_url ?? typia.random<string & tags.Format<"uri">>(),
  };
}
