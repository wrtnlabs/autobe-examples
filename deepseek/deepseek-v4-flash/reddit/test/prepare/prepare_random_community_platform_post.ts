import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random community platform post creation data for E2E testing.
 *
 * Generates a complete ICommunityPlatformPost.ICreate with randomized values.
 * The {@link type} discriminator is randomly selected to be "text", "link", or
 * "image". The corresponding type-specific content field (body, url, or
 * imageUri) is populated, while the other optional fields remain undefined.
 *
 * @param input Partial input to override specific generated values
 * @returns A complete ICommunityPlatformPost.ICreate with all properties
 */
export function prepare_random_community_platform_post(
  input?: DeepPartial<ICommunityPlatformPost.ICreate> | undefined,
): ICommunityPlatformPost.ICreate {
  const type =
    input?.type ?? RandomGenerator.pick(["text", "link", "image"] as const);
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    communityId:
      input?.communityId ?? typia.random<string & tags.Format<"uuid">>(),
    type,
    body:
      type === "text"
        ? (input?.body ?? RandomGenerator.content({ paragraphs: 2 }))
        : undefined,
    url:
      type === "link"
        ? (input?.url ?? typia.random<string & tags.Format<"uri">>())
        : undefined,
    imageUri:
      type === "image"
        ? (input?.imageUri ?? typia.random<string & tags.Format<"uri">>())
        : undefined,
  };
}
