import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_ban_record(
  input?: DeepPartial<IRedditCloneBanRecord.ICreate>,
): IRedditCloneBanRecord.ICreate {
  return {
    member_id: input?.member_id ?? typia.random<string & tags.Format<"uuid">>(),
    expires_at:
      input?.expires_at ??
      (Math.random() > 0.7
        ? RandomGenerator.date(
            new Date(),
            1000 * 60 * 60 * 24 * 30,
          ).toISOString()
        : null),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
