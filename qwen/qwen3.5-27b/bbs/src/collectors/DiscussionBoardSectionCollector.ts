import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardSectionCollector {
  export async function collect(props: {
    body: IDiscussionBoardSection.ICreate;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.discussion_board_sectionsCreateInput;
  }
}
