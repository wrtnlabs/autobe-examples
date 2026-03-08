import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardMemberAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        bio: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        _count: {
          select: {
            articles: true,
            comments: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardMember.ISummary> {
    return {
      id: input.id,
      displayName: input.display_name,
      bio: input.bio,
      articleCount: input._count.articles,
      commentCount: input._count.comments,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
