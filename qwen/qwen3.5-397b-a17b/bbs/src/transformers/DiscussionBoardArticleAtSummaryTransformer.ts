import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";

export namespace DiscussionBoardArticleAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_articlesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        created_at: true,
        author: DiscussionBoardMemberAtSummaryTransformer.select(),
        tags: {
          select: {
            tag: {
              select: {
                name: true,
              },
            },
          },
        } satisfies Prisma.discussion_board_article_tagsFindManyArgs,
        comments: {
          select: {
            id: true,
            deleted_at: true,
          },
        } satisfies Prisma.discussion_board_commentsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_articlesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticle.ISummary> {
    return {
      id: input.id,
      title: input.title,
      created_at: input.created_at.toISOString(),
      author: await DiscussionBoardMemberAtSummaryTransformer.transform(
        input.author,
      ),
      tags: input.tags.map((at) => at.tag.name),
      comments_count: input.comments.filter((c) => c.deleted_at === null)
        .length,
    };
  }
}
