import { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_ban(
  input?: DeepPartial<ICommunityBan.ICreate>,
): ICommunityBan.ICreate {
  return {
    username: input?.username ?? RandomGenerator.name(1),
    reason:
      input?.reason ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    expired_at:
      input?.expired_at ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
