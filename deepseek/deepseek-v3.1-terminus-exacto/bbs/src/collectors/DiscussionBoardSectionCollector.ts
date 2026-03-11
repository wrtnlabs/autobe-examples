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
    const id: string = v4();
    const now: Date = new Date();
    return {
      // Scalar fields
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      // Relations (not applicable for creation)
      snapshots: undefined,
      deletion: undefined,
      articles: undefined,
    } satisfies Prisma.discussion_board_sectionsCreateInput;
  }
}
