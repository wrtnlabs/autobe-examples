import { IDiscussionBoardAttachmentCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategoryMapping";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardAttachmentCategoryMappingCollector {
  export async function collect(props: {
    body: IDiscussionBoardAttachmentCategoryMapping.ICreate;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      created_at: new Date(),
      // BelongsTo relations (use connect, NOT direct FK)
      attachment: {
        connect: { id: props.body.discussion_board_attachment_id },
      },
      category: {
        connect: { id: props.body.discussion_board_attachment_category_id },
      },
    } satisfies Prisma.discussion_board_attachment_category_mappingsCreateInput;
  }
}
