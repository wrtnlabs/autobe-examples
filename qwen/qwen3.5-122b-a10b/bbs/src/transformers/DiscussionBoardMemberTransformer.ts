import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardMemberTransformer {
  export type Payload = Prisma.discussion_board_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        bio: true,
        ban_status: true,
        ban_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        _count: {
          select: {
            articles: true,
            comments: true,
          },
        },
        articles: {
          select: { id: true },
        } satisfies Prisma.discussion_board_articlesFindManyArgs,
        comments: {
          select: { id: true },
        } satisfies Prisma.discussion_board_commentsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardMember> {
    return {
      id: input.id,
      display_name: input.display_name,
      bio: input.bio ?? null,
      ban_status: input.ban_status,
      ban_reason: input.ban_reason ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      article_count: input._count.articles,
      comment_count: input._count.comments,
    };
  }
}
