import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformAdminAtSummaryTransformer {
  // 1. Payload type first
  export type Payload = Prisma.reddit_platform_adminsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        username: true,
        display_name: true,
        avatar_url: true,
      },
    } satisfies Prisma.reddit_platform_adminsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformAdmin.ISummary> {
    return {
      id: input.id,
      username: input.username,
      displayName: input.display_name ?? undefined,
      avatarUrl: input.avatar_url ?? undefined,
    };
  }
}
