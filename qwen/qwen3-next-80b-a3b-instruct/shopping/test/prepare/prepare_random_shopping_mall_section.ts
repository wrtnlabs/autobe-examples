import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
export function prepare_random_shopping_mall_section(
  input?: DeepPartial<IShoppingMallSection.ICreate>,
): IShoppingMallSection.ICreate {
  return {
    // Test-customizable string fields with length constraints
    name:
      input?.name ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        wordMin: 3,
        wordMax: 15,
      }),
    // Auto-generated numeric field with constraints
    displayOrder:
      input?.displayOrder ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    // Auto-generated boolean field
    isVisible: input?.isVisible ?? RandomGenerator.pick([true, false] as const),
    // Test-customizable code field with slug format
    code:
      input?.code ??
      RandomGenerator.alphaNumeric(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<50>
        >(),
      )
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-"),
    // Test-customizable enum field
    sectionType:
      input?.sectionType ??
      RandomGenerator.pick([
        "category",
        "brand",
        "promotion",
        "feature",
      ] as const),
    // Optional parent section code with valid format
    parentSectionCode:
      input?.parentSectionCode ??
      (typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>() ||
        RandomGenerator.alphaNumeric(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<50>
          >(),
        )
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")), // Test-customizable meta title field with max 60 characters
    metaTitle:
      input?.metaTitle ??
      RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 2,
        wordMax: 8,
      }),
    // Test-customizable meta description field with max 160 characters
    metaDescription:
      input?.metaDescription ??
      RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 2,
        wordMax: 10,
      }),
    // Test-customizable URI banner image
    bannerImage:
      input?.bannerImage ??
      `https://cdn.example.com/banners/${RandomGenerator.alphaNumeric(12)}.jpg`,
    // Test-customizable URI secondary image
    secondaryImage:
      input?.secondaryImage ??
      `https://cdn.example.com/secondary/${RandomGenerator.alphaNumeric(12)}.png`,
    // Auto-generated boolean field for active status
    isActive: input?.isActive ?? RandomGenerator.pick([true, false] as const),
  };
}
