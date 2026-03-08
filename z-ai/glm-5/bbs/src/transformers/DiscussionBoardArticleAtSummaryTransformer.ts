import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";
import { DiscussionBoardSectionAtSummaryTransformer } from "./DiscussionBoardSectionAtSummaryTransformer";
import { DiscussionBoardTagAtSummaryTransformer } from "./DiscussionBoardTagAtSummaryTransformer";

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
        updated_at: true,
        deleted_at: true,
        member: DiscussionBoardMemberAtSummaryTransformer.select(),
        section: DiscussionBoardSectionAtSummaryTransformer.select(),
        articleTags: {
          select: {
            tag: DiscussionBoardTagAtSummaryTransformer.select(),
          },
        } satisfies Prisma.discussion_board_article_tagsFindManyArgs,
        comments: {
          select: {
            id: true,
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
      author: await DiscussionBoardMemberAtSummaryTransformer.transform(
        input.member,
      ),
      section: await DiscussionBoardSectionAtSummaryTransformer.transform(
        input.section,
      ),
      tags: await ArrayUtil.asyncMap(input.articleTags, (at) =>
        DiscussionBoardTagAtSummaryTransformer.transform(at.tag),
      ),
      comments_count: input.comments.length,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
