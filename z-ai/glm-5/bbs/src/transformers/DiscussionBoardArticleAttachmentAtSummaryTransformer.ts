import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleAttachmentAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_article_attachmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        type: true,
        name: true,
        extension: true,
        size: true,
        created_at: true,
      },
    } satisfies Prisma.discussion_board_article_attachmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleAttachment.ISummary> {
    return {
      id: input.id,
      type: input.type as "file" | "image",
      name: input.name,
      extension: input.extension,
      size: input.size,
      created_at: input.created_at.toISOString(),
    };
  }
}
