import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardTagCollector {
  export async function collect(props: { body: IDiscussionBoardTag.ICreate }) {
    const id: string = v4();
    return {
      id,
      name: "", // ⚠️ TEMP: Empty string until DTO is updated
      created_at: new Date(),
    } satisfies Prisma.discussion_board_tagsCreateInput;
  }
}
