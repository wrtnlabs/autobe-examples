import { IDiscussionBoardBanReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanReasonCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardBanReasonCategoryCollector {
  export async function collect(props: {
    body: IDiscussionBoardBanReasonCategory.ICreate;
  }) {
    const id: string = v4();
    return {
      // Generated fields
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // Direct mappings from DTO
      name: props.body.name,
      description: props.body.description,
      is_active: props.body.is_active,
      sort_order: props.body.sort_order,
    } satisfies Prisma.discussion_board_ban_reason_categoriesCreateInput;
  }
}
