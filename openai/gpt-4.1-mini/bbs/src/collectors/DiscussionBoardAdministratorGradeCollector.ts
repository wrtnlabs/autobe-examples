import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardAdministratorGradeCollector {
  export async function collect(props: {
    body: IDiscussionBoardAdministratorGrade.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description,
      level: props.body.level,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // HasMany relations (optional, not created during this operation)
      administrators: undefined,
      gradeChanges: undefined,
      oldGradePromotions: undefined,
      newGradePromotions: undefined,
    } satisfies Prisma.discussion_board_administrator_gradesCreateInput;
  }
}
