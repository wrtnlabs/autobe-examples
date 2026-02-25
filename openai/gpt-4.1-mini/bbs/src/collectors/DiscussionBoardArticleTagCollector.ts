import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleTagCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticleTag.ICreate;
  }) {
    const id = v4();
    const now = new Date();
    return {
      id,
      name: props.body.name,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    } satisfies Prisma.discussion_board_tagsCreateInput;
  }
}
