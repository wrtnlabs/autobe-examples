import { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardCommentAttachmentAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_comment_attachmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        comment: {
          select: {
            id: true,
          },
        },
        file: {
          select: {
            file_name: true,
            file_type: true,
            file_size: true,
            created_at: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_comment_attachmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentAttachment.ISummary> {
    return {
      id: input.id,
      file_name: input.file.file_name,
      file_type: input.file.file_type,
      file_size: input.file.file_size,
      created_at: input.file.created_at.toISOString(),
    };
  }
}
