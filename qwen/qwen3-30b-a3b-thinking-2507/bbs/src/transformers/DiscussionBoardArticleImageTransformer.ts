import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";

export namespace DiscussionBoardArticleImageTransformer {
  export type Payload = Prisma.discussion_board_article_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        url: true,
        width: true,
        height: true,
        mime_type: true,
        size: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        article: DiscussionBoardArticleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_article_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleImage> {
    return {
      id: input.id,
      article: await DiscussionBoardArticleAtSummaryTransformer.transform(
        input.article,
      ),
      file_name: input.url.split("/").pop() || input.url,
      mime_type: input.mime_type as
        | "image/jpeg"
        | "image/png"
        | "image/gif"
        | "image/svg+xml"
        | "application/pdf"
        | "application/vnd.ms-excel"
        | "application/msword"
        | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        | "application/vnd.ms-powerpoint"
        | "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      size: input.size,
      url: input.url,
      is_primary: false,
      display_order: 0,
      created_at: input.created_at.toISOString(),
    };
  }
}
