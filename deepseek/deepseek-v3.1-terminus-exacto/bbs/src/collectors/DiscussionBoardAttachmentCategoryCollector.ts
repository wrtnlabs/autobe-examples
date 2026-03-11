import { IDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardAttachmentCategoryCollector {
  export async function collect(props: {
    body: IDiscussionBoardAttachmentCategory.ICreate;
  }) {
    const id: string = crypto.randomUUID();
    return {
      // Scalar fields
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      order_index: props.body.order_index,
      is_active: props.body.is_active,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relation (optional)
      parent: props.body.parent_id
        ? { connect: { id: props.body.parent_id } }
        : undefined,
      // HasMany relations (reverse side - not applicable for creation)
      children: undefined,
      attachmentMappings: undefined,
    } satisfies Prisma.discussion_board_attachment_categoriesCreateInput;
  }
}
