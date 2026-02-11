import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_community_community(
  input?: DeepPartial<IRedditCommunityCommunity.ICreate> | undefined,
): IRedditCommunityCommunity.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ??
      (typia.random<boolean>()
        ? RandomGenerator.paragraph({
            sentences: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
            >(),
          })
        : null),
    icon_url:
      input?.icon_url ??
      (typia.random<boolean>()
        ? typia.random<string & tags.Format<"url">>()
        : null),
  };
}
