import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

export namespace DiscussionBoardArticleTransformer {
  export type Payload = Prisma.discussion_board_articlesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        section: DiscussionBoardSectionAtSummaryTransformer.select(),
        member: DiscussionBoardMemberAtSummaryTransformer.select(),
        articleTags: {
          select: {
            tag: DiscussionBoardTagAtSummaryTransformer.select(),
          },
        } satisfies Prisma.discussion_board_article_tagsFindManyArgs,
        snapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_article_snapshotsFindManyArgs,
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
  ): Promise<IDiscussionBoardArticle> {
    return {
      id: input.id,
      title: input.title,
      body: input.body,
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
