import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneUserProfileAtSummaryTransformer } from "./RedditCloneUserProfileAtSummaryTransformer";

export namespace RedditCloneModeratorAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_moderatorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        userProfile: RedditCloneUserProfileAtSummaryTransformer.select(),
        created_at: true,
      },
    } satisfies Prisma.reddit_clone_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneModerator.ISummary> {
    return {
      id: input.id,
      email: input.email,
      profile: await RedditCloneUserProfileAtSummaryTransformer.transform(
        input.userProfile,
      ),
      created_at: input.created_at.toISOString(),
    };
  }
}
