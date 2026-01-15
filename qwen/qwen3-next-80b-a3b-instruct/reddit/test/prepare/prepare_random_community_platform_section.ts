import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";
export function prepare_random_community_platform_section(
  input?: DeepPartial<ICommunityPlatformSection.ICreate>,
): ICommunityPlatformSection.ICreate {
  return {
    // Test-customizable: human-readable section name
    name:
      input?.name ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        wordMin: 3,
        wordMax: 8,
      }),
    // Test-customizable: optional detailed description (nullable)
    description:
      input?.description ??
      (input?.description === ""
        ? ""
        : RandomGenerator.content({
            paragraphs: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<3>
            >(),
            sentenceMin: 5,
            sentenceMax: 12,
            wordMin: 3,
            wordMax: 8,
          })),
    // Auto-generated: UUID reference to parent section
    parent_section_id:
      input?.parent_section_id ?? typia.random<string & tags.Format<"uuid">>(),
    // Test-customizable: visibility level enum
    visibility_level:
      input?.visibility_level ??
      RandomGenerator.pick([
        "public",
        "registered",
        "moderated",
        "private",
      ] as const),
  };
}
