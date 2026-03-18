import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_community(
  input?: DeepPartial<ICommunityPlatformCommunity.ICreate> | undefined,
): ICommunityPlatformCommunity.ICreate {
  return {
    name: input?.name ?? RandomGenerator.paragraph({ sentences: 1 }),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 2 }),
    icon_href:
      input?.icon_href ??
      typia.random<
        string & tags.Format<"url"> & tags.MinLength<1> & tags.MaxLength<80000>
      >(),
  };
}
