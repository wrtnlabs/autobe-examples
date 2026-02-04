import { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_channel(
  input?: DeepPartial<ICommunityPlatformChannel.ICreate> | undefined,
): ICommunityPlatformChannel.ICreate {
  return {
    name:
      input?.name ??
      typia.random<
        string &
          tags.MinLength<10> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        sentenceMin: 3,
        sentenceMax: 10,
      }),
    icon_url:
      input?.icon_url ??
      (Math.random() < 0.5
        ? null
        : typia.random<string & tags.Format<"uri">>()),
  };
}
