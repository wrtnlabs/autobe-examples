import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeModeratorRoleAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_moderator_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        role: true,
        created_at: true,
      },
    } satisfies Prisma.reddit_like_moderator_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeModeratorRole.ISummary> {
    return {
      id: input.id,
      role: typia.assert<"owner" | "moderator">(input.role),
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
