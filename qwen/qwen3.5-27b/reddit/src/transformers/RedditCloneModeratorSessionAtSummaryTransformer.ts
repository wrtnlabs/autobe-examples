import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSession";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneModeratorAtSummaryTransformer } from "./RedditCloneModeratorAtSummaryTransformer";

export namespace RedditCloneModeratorSessionAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_moderator_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        moderator: RedditCloneModeratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_moderator_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneModeratorSession.ISummary> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer ?? null,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      moderator: await RedditCloneModeratorAtSummaryTransformer.transform(
        input.moderator,
      ),
    };
  }
}
