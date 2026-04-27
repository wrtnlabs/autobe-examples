import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random community platform community creation data for E2E testing.
 *
 * Generates a complete ICommunityPlatformCommunity.ICreate with randomized
 * values including a unique community name, descriptive text, and at least one
 * icon image with proper MIME type, file size, and upload URI.
 *
 * @param input Optional partial input to override specific generated values
 * @returns A fully populated ICommunityPlatformCommunity.ICreate suitable for
 *          creating a new community via the API
 */
export function prepare_random_community_platform_community(
  input?: DeepPartial<ICommunityPlatformCommunity.ICreate> | undefined,
): ICommunityPlatformCommunity.ICreate {
  return {
    name: input?.name ?? RandomGenerator.alphabets(10),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
    images: input?.images
      ? input.images.map((image) => ({
          name: image.name ?? RandomGenerator.name(1),
          mime_type:
            image.mime_type ??
            RandomGenerator.pick([
              "image/png",
              "image/jpeg",
              "image/webp",
            ] as const),
          size:
            image.size ??
            typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          url: image.url ?? typia.random<string & tags.Format<"uri">>(),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            name: RandomGenerator.name(1),
            mime_type: RandomGenerator.pick([
              "image/png",
              "image/jpeg",
              "image/webp",
            ] as const),
            size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
            url: typia.random<string & tags.Format<"uri">>(),
          }),
        ),
  };
}
