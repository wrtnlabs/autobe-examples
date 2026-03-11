import { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardStatusEnumCollector {
  export async function collect(props: {
    body: IDiscussionBoardStatusEnum.ICreate;
  }) {
    return {
      // Scalar fields from DTO
      id: v4(),
      entity_type: props.body.entity_type,
      value: props.body.value,
      description: props.body.description,
      sort_order: props.body.sort_order ?? 0,
      // System-managed fields
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // HasMany relations (not applicable for creation)
      snapshots: undefined,
      statusEnumReferences: undefined,
    } satisfies Prisma.discussion_board_status_enumsCreateInput;
  }
}
