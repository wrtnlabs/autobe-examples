import { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random community hub post creation data for E2E testing.
 *
 * Generates a complete ICommunityHubPost.ICreate with randomized values
 * suitable for testing all post types (text, link, image) within a
 * community hub context.
 *
 * The post type is randomly selected from the three available variants.
 * For text posts, a generated body provides content; for link posts, a
 * valid URI is supplied; for image posts, a simulated file upload record
 * is included. All optional fields are populated with defaults to enable
 * comprehensive test coverage.
 *
 * The caller may override any property via the DeepPartial input to
 * customize specific fields for targeted test scenarios (e.g., testing
 * missing title validation, specific post types, or partial image data).
 */
export function prepare_random_community_hub_post(
  input?: DeepPartial<ICommunityHubPost.ICreate>,
): ICommunityHubPost.ICreate {
  return {
    type:
      input?.type ?? RandomGenerator.pick(["text", "link", "image"] as const),
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    body: input?.body ?? RandomGenerator.content({ paragraphs: 2 }),
    url: input?.url ?? typia.random<string & tags.Format<"uri">>(),
    image: input?.image
      ? {
          file: input.image.file ?? RandomGenerator.alphaNumeric(10) + ".png",
        }
      : {
          file: RandomGenerator.alphaNumeric(10) + ".png",
        },
  };
}
