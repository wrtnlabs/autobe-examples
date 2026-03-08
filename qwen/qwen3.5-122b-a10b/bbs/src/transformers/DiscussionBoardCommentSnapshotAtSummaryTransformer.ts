import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";
import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";

export namespace DiscussionBoardCommentSnapshotAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_comment_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        comment_created_at: true,
        comment_updated_at: true,
        snapshot_created_at: true,
        discussion_board_article_id: true,
        discussion_board_member_id: true,
        comment: {
          select: {
            member: DiscussionBoardMemberAtSummaryTransformer.select(),
            article: DiscussionBoardArticleAtSummaryTransformer.select(),
          },
        },
      },
    } satisfies Prisma.discussion_board_comment_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentSnapshot.ISummary> {
    return {
      id: input.id,
      content: input.content,
      comment_created_at: toISOStringSafe(input.comment_created_at),
      comment_updated_at: toISOStringSafe(input.comment_updated_at),
      snapshot_created_at: toISOStringSafe(input.snapshot_created_at),
      author: await DiscussionBoardMemberAtSummaryTransformer.transform(
        input.comment.member,
      ),
      article: await DiscussionBoardArticleAtSummaryTransformer.transform(
        input.comment.article,
      ),
    };
  }
}
