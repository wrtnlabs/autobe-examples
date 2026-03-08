import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardArticleAttachmentTransformer } from "./DiscussionBoardArticleAttachmentTransformer";
import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";
import { DiscussionBoardSectionAtSummaryTransformer } from "./DiscussionBoardSectionAtSummaryTransformer";
import { DiscussionBoardTagTransformer } from "./DiscussionBoardTagTransformer";

export namespace DiscussionBoardArticleTransformer {
  export type Payload = Prisma.discussion_board_articlesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        content: true,
        created_at: true,
        updated_at: true,
        member: DiscussionBoardMemberAtSummaryTransformer.select(),
        section: DiscussionBoardSectionAtSummaryTransformer.select(),
        articleTags: {
          select: {
            tag: DiscussionBoardTagTransformer.select(),
          },
        } satisfies Prisma.discussion_board_article_tagsFindManyArgs,
        attachments: DiscussionBoardArticleAttachmentTransformer.select(),
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
      content: input.content,
      author: await DiscussionBoardMemberAtSummaryTransformer.transform(
        input.member,
      ),
      section: await DiscussionBoardSectionAtSummaryTransformer.transform(
        input.section,
      ),
      tags: await ArrayUtil.asyncMap(input.articleTags, (at) =>
        DiscussionBoardTagTransformer.transform(at.tag),
      ),
      attachments: await ArrayUtil.asyncMap(
        input.attachments,
        DiscussionBoardArticleAttachmentTransformer.transform,
      ),
      comments_count: input.comments.length,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
