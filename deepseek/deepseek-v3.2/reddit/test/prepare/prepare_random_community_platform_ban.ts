import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_ban(
  input?: DeepPartial<ICommunityPlatformBan.ICreate> | undefined,
): ICommunityPlatformBan.ICreate {
  return {
    memberId: input?.memberId ?? typia.random<string & tags.Format<"uuid">>(),
    reason:
      input?.reason ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 1,
        sentenceMax: 3,
        wordMin: 3,
        wordMax: 12,
      }),
    expiresAt:
      input?.expiresAt !== undefined
        ? input.expiresAt
        : RandomGenerator.date(
            new Date(),
            1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
  };
}
