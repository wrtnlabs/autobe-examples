import { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardStatusTypeCollector {
  export async function collect(props: {
    body: IDiscussionBoardStatusType.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      category: props.body.category,
      code: props.body.code,
      display_name: props.body.display_name,
      description: props.body.description ?? null,
      display_order: props.body.display_order ?? 0,
      is_active: props.body.is_active ?? true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.discussion_board_status_typesCreateInput;
  }
}
