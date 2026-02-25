import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_community(
  input?: DeepPartial<ICommunityCommunity.ICreate>,
): ICommunityCommunity.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.alphaNumeric(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<21>
        >(),
      ),
    description:
      input?.description ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<10>
        >(),
        wordMin: 5,
        wordMax: 10,
      }),
    icon_url: input?.icon_url ?? typia.random<string & tags.Format<"url">>(),
  };
}
