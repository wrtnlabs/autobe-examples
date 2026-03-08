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
    discussionBoardAdmins: IEntity;
  }) {
    const id: string = v4();
    // Query for the max sequence to determine display order
    const maxSequence =
      await MyGlobal.prisma.discussion_board_sections.aggregate({
        _max: {
          sequence: true,
        },
      });
    const sequence = (maxSequence._max.sequence ?? -1) + 1;
    return {
      id,
      name: props.body.name,
      description: props.body.description,
      sequence,
      created_at: new Date(),
      updated_at: new Date(),
      creator: { connect: { id: props.discussionBoardAdmins.id } },
    } satisfies Prisma.discussion_board_sectionsCreateInput;
  }
}
