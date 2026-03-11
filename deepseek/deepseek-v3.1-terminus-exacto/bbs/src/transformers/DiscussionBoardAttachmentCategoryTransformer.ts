import { IDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAttachmentCategoryAtSummaryTransformer } from "./DiscussionBoardAttachmentCategoryAtSummaryTransformer";

export namespace DiscussionBoardAttachmentCategoryTransformer {
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
        parent: DiscussionBoardAttachmentCategoryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_attachment_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAttachmentCategory> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      orderIndex: input.order_index,
      isActive: input.is_active,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
      parent: input.parent
        ? await DiscussionBoardAttachmentCategoryAtSummaryTransformer.transform(
            input.parent,
          )
        : undefined,
    };
  }
}
