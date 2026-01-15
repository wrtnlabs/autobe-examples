import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";
import { ICommunityPlatformChannelSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannelSettings";
export function prepare_random_community_platform_channel(
  input?: DeepPartial<ICommunityPlatformChannel.ICreate>,
): ICommunityPlatformChannel.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        wordMin: 2,
        wordMax: 10,
      }).substring(0, 100),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 3,
        sentenceMax: 10,
      }).substring(0, 500),
    is_public: input?.is_public ?? RandomGenerator.pick([true, false] as const),
    settings:
      input?.settings ??
      `{"enabled":${RandomGenerator.pick([true, false] as const)},"moderationLevel":"${RandomGenerator.pick(["none", "light", "strict"] as const)}","maxPostsPerDay":${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>>()},"customFields":{"${RandomGenerator.alphaNumeric(5)}":"${RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 5 })}"}}`,
  };
}
