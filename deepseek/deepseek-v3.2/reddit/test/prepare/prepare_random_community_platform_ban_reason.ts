import { ICommunityPlatformBanReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanReason";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_ban_reason(
  input?: DeepPartial<ICommunityPlatformBanReason.ICreate> | undefined,
): ICommunityPlatformBanReason.ICreate {
  return {
    code:
      input?.code ??
      RandomGenerator.alphaNumeric(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<8> & tags.Maximum<12>
        >(),
      ),
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 2,
        sentenceMax: 5,
        wordMin: 5,
        wordMax: 15,
      }),
    severity:
      input?.severity ??
      RandomGenerator.pick(["low", "medium", "high", "critical"] as const),
    active: input?.active ?? true,
  };
}
