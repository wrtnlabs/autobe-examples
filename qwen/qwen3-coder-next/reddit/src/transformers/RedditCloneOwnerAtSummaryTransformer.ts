import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneOwnerAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_ownersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        username: true,
        display_name: true,
        avatar_url: true,
      },
    } satisfies Prisma.reddit_clone_ownersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneOwner.ISummary> {
    return {
      id: input.id,
      username: input.username,
      displayName: input.display_name ?? undefined,
      avatarUrl: input.avatar_url ?? undefined,
    };
  }
}
