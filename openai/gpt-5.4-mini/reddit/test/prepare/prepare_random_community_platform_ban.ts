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
    communityPlatformMemberId:
      input?.communityPlatformMemberId ??
      typia.random<string & tags.Format<"uuid">>(),
    reason:
      input?.reason ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    startedAt:
      input?.startedAt ?? typia.random<string & tags.Format<"date-time">>(),
    endedAt: input?.endedAt !== undefined ? input.endedAt : null,
  };
}
