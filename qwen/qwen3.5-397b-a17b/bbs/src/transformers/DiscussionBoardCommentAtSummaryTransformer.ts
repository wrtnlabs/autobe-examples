import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";
import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";

export namespace DiscussionBoardCommentAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: DiscussionBoardMemberAtSummaryTransformer.select(),
        article: DiscussionBoardArticleAtSummaryTransformer.select(),
        snapshots: {
          select: {
            id: true,
            content: true,
            created_at: true,
          },
        } satisfies Prisma.discussion_board_comment_snapshotsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardComment.ISummary> {
    return {
      id: input.id,
      content: input.content,
      author: await DiscussionBoardMemberAtSummaryTransformer.transform(
        input.member,
      ),
      article: await DiscussionBoardArticleAtSummaryTransformer.transform(
        input.article,
      ),
      created_at: input.created_at.toISOString(),
    };
  }
}
