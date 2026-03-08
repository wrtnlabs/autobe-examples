import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeAdminAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        username: true,
        display_name: true,
      },
    } satisfies Prisma.reddit_like_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeAdmin.ISummary> {
    return {
      id: input.id,
      username: input.username,
      display_name: input.display_name,
    };
  }
}
