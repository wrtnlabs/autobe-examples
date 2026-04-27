import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random community platform community image creation data for E2E testing.
 *
 * Generates a complete ICommunityPlatformCommunityImage.ICreate with randomized values
 * for the image file metadata including filename, MIME type, file size, and a file
 * content URI. Each property can be overridden via the optional DeepPartial input
 * parameter for test-specific customization.
 *
 * @param input Optional partial data to override specific generated values
 * @returns A fully populated ICommunityPlatformCommunityImage.ICreate with random test data
 */
export function prepare_random_community_platform_community_image(
  input?: DeepPartial<ICommunityPlatformCommunityImage.ICreate> | undefined,
): ICommunityPlatformCommunityImage.ICreate {
  return {
    name: input?.name ?? `${RandomGenerator.alphabets(12)}.png`,
    mime_type:
      input?.mime_type ??
      RandomGenerator.pick([
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif",
        "image/svg+xml",
      ] as const),
    size:
      input?.size ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
      >(),
    url: input?.url ?? typia.random<string & tags.Format<"uri">>(),
  };
}
