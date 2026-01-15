import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformProductWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductWishlist";
export function prepare_random_community_platform_product_wishlist(
  input?: DeepPartial<ICommunityPlatformProductWishlist.ICreate>,
): ICommunityPlatformProductWishlist.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
        >(),
        wordMin: 3,
        wordMax: 7,
      }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<2>
        >(),
        sentenceMin: 5,
        sentenceMax: 15,
        wordMin: 3,
        wordMax: 8,
      }),
  };
}
