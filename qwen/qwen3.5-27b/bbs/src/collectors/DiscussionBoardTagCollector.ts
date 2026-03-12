import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardTagCollector {
  export async function collect(props: { body: IDiscussionBoardTag.ICreate }) {
    return {
      id: v4(),
      name: props.body.name,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.discussion_board_tagsCreateInput;
  }
}
