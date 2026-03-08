import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeModeratorRoleTransformer {
  export type Payload = Prisma.reddit_like_moderator_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        role: true,
        created_at: true,
        user: {
          select: { id: true },
        } satisfies Prisma.reddit_like_membersFindManyArgs,
        community: {
          select: { id: true },
        } satisfies Prisma.reddit_like_communitiesFindManyArgs,
      },
    } satisfies Prisma.reddit_like_moderator_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeModeratorRole> {
    return {
      user_id: input.user.id,
      community_id: input.community.id,
      role: typia.assert<"owner" | "moderator">(input.role),
    };
  }
}
