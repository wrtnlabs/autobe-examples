import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
export function prepare_random_reddit_clone_user_karma(input?: DeepPartial<IRedditCloneUserKarma.ICreate>): IRedditCloneUserKarma.ICreate {
    return {
        bannedUsername: input?.bannedUsername ?? RandomGenerator.name(1),
        reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
        expires_at: input?.expires_at ?? (() => {
            const pick = RandomGenerator.pick([
                undefined,
                typia.random<string & tags.Format<"date-time">>(),
            ]);
            return pick ?? undefined;
        })()
    };
}