import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardAdministratorGradeCollector {
  function toISOStringSafe(date: Date): string {
    return date.toISOString();
  }
  export async function collect(props: {
    body: IDiscussionBoardAdministratorGrade.ICreate;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      name: "",
      description: "",
      level: 0,
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
      deleted_at: null,
    } satisfies Prisma.discussion_board_administrator_gradesCreateInput;
  }
}
