import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneModeratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorPasswordReset";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneModeratorAtSummaryTransformer } from "./RedditCloneModeratorAtSummaryTransformer";

export namespace RedditCloneModeratorPasswordResetTransformer {
  export type Payload = Prisma.reddit_clone_moderator_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        created_at: true,
        expires_at: true,
        moderator: RedditCloneModeratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_moderator_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneModeratorPasswordReset> {
    return {
      id: input.id,
      moderator: await RedditCloneModeratorAtSummaryTransformer.transform(
        input.moderator,
      ),
      status: input.expires_at >= new Date() ? "active" : "expired",
      created_at: input.created_at.toISOString(),
      expires_at: input.expires_at.toISOString(),
    };
  }
}
