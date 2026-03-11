import { IDiscussionBoardAttachmentCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategoryMapping";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAttachmentCategoryMappingAtResponseItemTransformer {
  export type Payload =
    Prisma.discussion_board_attachment_category_mappingsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        attachment: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_attachmentsFindManyArgs,
        category: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_attachment_categoriesFindManyArgs,
      },
    } satisfies Prisma.discussion_board_attachment_category_mappingsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAttachmentCategoryMapping.IResponseItem> {
    return {
      id: input.id,
      attachment_id: input.attachment.id,
      category_id: input.category.id,
      success: true,
      error_message: undefined,
      created_at: input.created_at.toISOString(),
    };
  }
}
