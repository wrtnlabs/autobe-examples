import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";
import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";

export namespace DiscussionBoardCommentSnapshotTransformer {
  export type Payload = Prisma.discussion_board_comment_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        comment: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_commentsFindManyArgs,
        discussion_board_article_id: true,
        discussion_board_member_id: true,
        content: true,
        created_at: true,
        updated_at: true,
        snapshot_at: true,
      },
    } satisfies Prisma.discussion_board_comment_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentSnapshot> {
    return {
      id: input.id,
      commentId: input.comment.id,
      article: await DiscussionBoardArticleAtSummaryTransformer.transform({
        id: input.discussion_board_article_id,
      } as any),
      author: await DiscussionBoardMemberAtSummaryTransformer.transform({
        id: input.discussion_board_member_id,
      } as any),
      content: input.content,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      snapshot_at: input.snapshot_at.toISOString(),
    };
  }
}
