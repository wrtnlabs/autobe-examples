import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_platform_community(
  input?: DeepPartial<IRedditPlatformCommunity.ICreate> | undefined,
): IRedditPlatformCommunity.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ??
      (typia.random<boolean>()
        ? RandomGenerator.paragraph({
            sentences: typia.random<
              number & tags.Minimum<1> & tags.Maximum<10>
            >(),
          })
        : null),
    icon_file_id:
      input?.icon_file_id ??
      (typia.random<boolean>()
        ? typia.random<string & tags.Format<"uuid">>()
        : null),
  };
}
