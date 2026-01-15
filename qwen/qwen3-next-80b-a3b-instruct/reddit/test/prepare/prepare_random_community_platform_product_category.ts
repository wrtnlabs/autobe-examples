import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
export function prepare_random_community_platform_product_category(
  input?: DeepPartial<ICommunityPlatformProductCategory.ICreate> | undefined,
): ICommunityPlatformProductCategory.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        wordMin: 2,
        wordMax: 8,
      }),
    description:
      input?.description ??
      (RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
        >(),
        wordMin: 3,
        wordMax: 6,
      }) as string & tags.MaxLength<500>),
    parent_id:
      input?.parent_id ??
      RandomGenerator.pick([
        null,
        typia.random<string & tags.Format<"uuid">>(),
      ] as const),
    status:
      input?.status ?? RandomGenerator.pick(["active", "inactive"] as const),
  };
}
