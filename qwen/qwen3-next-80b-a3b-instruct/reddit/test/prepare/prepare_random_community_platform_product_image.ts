import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
export function prepare_random_community_platform_product_image(
  input?: DeepPartial<ICommunityPlatformProductImage.ICreate>,
): ICommunityPlatformProductImage.ICreate {
  return {
    productCode:
      input?.productCode ??
      RandomGenerator.alphaNumeric(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<8> & tags.Maximum<12>
        >(),
      ),
    name:
      input?.name ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        wordMin: 2,
        wordMax: 6,
      }),
    extension:
      input?.extension ??
      RandomGenerator.pick([
        "jpg",
        "jpeg",
        "png",
        "gif",
        "webp",
        "bmp",
        "tiff",
      ] as const),
    url:
      input?.url ??
      `https://cdn.example.com/product/${input?.productCode ?? RandomGenerator.alphaNumeric(typia.random<number & tags.Type<"uint32"> & tags.Minimum<8> & tags.Maximum<12>>())}/${RandomGenerator.alphaNumeric(10)}.${input?.extension ?? RandomGenerator.pick(["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff"] as const)}`,
    is_primary:
      input?.is_primary ?? RandomGenerator.pick([true, false] as const),
    alt_text:
      input?.alt_text ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
        >(),
        wordMin: 2,
        wordMax: 6,
      }),
    order:
      input?.order ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<9999>
      >(),
  };
}
