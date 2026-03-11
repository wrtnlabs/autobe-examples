import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentThumbnail";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAttachmentAtSummaryTransformer } from "./DiscussionBoardAttachmentAtSummaryTransformer";

export namespace DiscussionBoardAttachmentThumbnailAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_attachment_thumbnailsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        width: true,
        height: true,
        size_category: true,
        file_size: true,
        content_type: true,
        created_at: true,
        attachment: DiscussionBoardAttachmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_attachment_thumbnailsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAttachmentThumbnail.ISummary> {
    return {
      id: input.id,
      width: input.width,
      height: input.height,
      size_category: (input.size_category ?? "") satisfies string as string,
      file_size: input.file_size,
      content_type: input.content_type,
      created_at: toISOStringSafe(input.created_at),
      attachment: await DiscussionBoardAttachmentAtSummaryTransformer.transform(
        input.attachment,
      ),
    };
  }
}
