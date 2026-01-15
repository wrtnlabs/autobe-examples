import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";

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
        moderation_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: DiscussionBoardMemberAtSummaryTransformer.select(),
        discussion_board_moderation_actions: {
          select: {
            id: true,
          },
        },
        discussion_board_article_images: {
          take: 1,
          select: {
            url: true,
          },
        },
        discussion_board_article_files: {
          select: {
            id: true,
          },
        },
        discussion_board_attachment_images: {
          select: {
            id: true,
          },
        },
        discussion_board_attachment_files: {
          select: {
            id: true,
          },
        },
        discussion_board_moderation_queue: {
          select: {
            id: true,
          },
        },
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
      code: input.id,
      status: input.moderation_status as
        | "draft"
        | "pending"
        | "approved"
        | "rejected",
      author: await DiscussionBoardMemberAtSummaryTransformer.transform(
        input.member,
      ),
      publishedAt: input.created_at.toISOString(),
      imageUrl: input.discussion_board_article_images[0]?.url,
      createdAt: input.created_at.toISOString(),
      commentsCount: 0,
      moderationActionIds: input.discussion_board_moderation_actions.map(
        (action) => action.id,
      ),
    };
  }
}
