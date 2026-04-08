import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneUserProfileAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_user_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        bio: true,
        avatar: true,
        karma: true,
        created_at: true,
      },
    } satisfies Prisma.reddit_clone_user_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneUserProfile.ISummary> {
    return {
      id: input.id,
      display_name: input.display_name,
      bio: input.bio,
      avatar: input.avatar,
      karma: input.karma,
      created_at: input.created_at.toISOString(),
    };
  }
}
