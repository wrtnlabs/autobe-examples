import { IDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAttachmentCategoryAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_attachment_categoriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        order_index: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parent: {
          select: {
            id: true,
            name: true,
            description: true,
            order_index: true,
            is_active: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.discussion_board_attachment_categoriesFindManyArgs,
        children: {
          select: {
            id: true,
            name: true,
            description: true,
            order_index: true,
            is_active: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.discussion_board_attachment_categoriesFindManyArgs,
        attachmentMappings: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_attachment_category_mappingsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_attachment_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAttachmentCategory.ISummary> {
    return {
      id: input.id,
      name: input.name,
      order_index: input.order_index,
      is_active: input.is_active,
      parent: input.parent
        ? ({
            id: input.parent.id,
            name: input.parent.name,
            order_index: input.parent.order_index,
            is_active: input.parent.is_active,
            parent: null, // Parent's parent is not included in this summary
            created_at: input.parent.created_at.toISOString(),
          } satisfies IDiscussionBoardAttachmentCategory.ISummary)
        : null,
      created_at: input.created_at.toISOString(),
    };
  }
}
