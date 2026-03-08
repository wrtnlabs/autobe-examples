import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardTagCollector {
  export async function collect(props: { body: IDiscussionBoardTag.ICreate }) {
    const id: string = crypto.randomUUID();
    const now: Date = new Date();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      articleTags: undefined,
    } satisfies Prisma.discussion_board_tagsCreateInput;
  }
}
