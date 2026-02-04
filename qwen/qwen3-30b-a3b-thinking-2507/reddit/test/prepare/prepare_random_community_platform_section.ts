import { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_section(
  input?: DeepPartial<ICommunityPlatformSection.ICreate>,
): ICommunityPlatformSection.ICreate {
  return {
    name:
      input?.name ??
      Array.from(
        {
          length: typia.random<number>(),
        },
        () =>
          RandomGenerator.alphabets(typia.random<number>()),
      ).join("_"),
    description:
      input?.description ??
      RandomGenerator.paragraph({
        sentences: typia.random<number>(),
      }),
    sortOrder:
      input?.sortOrder ??
      typia.random<number>(),
  };
}