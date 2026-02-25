import { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardAdministratorGradeChangeCollector {
  export async function collect(props: {
    body: IDiscussionBoardAdministratorGradeChange.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      administrator: {
        connect: { id: props.body.discussion_board_administrator_id },
      },
      grade: {
        connect: { id: props.body.discussion_board_administrator_grade_id },
      },
    } satisfies Prisma.discussion_board_administrator_grade_changesCreateInput;
  }
}
