import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardUserTransformer {
  export type Payload = Prisma.discussion_board_usersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        bio: true,
        created_at: true,
        articles: {
          select: { id: true },
          where: { deleted_at: null },
        } satisfies Prisma.discussion_board_articlesFindManyArgs,
        comments: {
          select: { id: true },
          where: { deleted_at: null },
        } satisfies Prisma.discussion_board_commentsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_usersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardUser> {
    return {
      id: input.id,
      displayName: input.display_name,
      bio: input.bio ?? null,
      memberSince: input.created_at.toISOString(),
      articleCount: input.articles.length,
      commentCount: input.comments.length,
    };
  }
}
