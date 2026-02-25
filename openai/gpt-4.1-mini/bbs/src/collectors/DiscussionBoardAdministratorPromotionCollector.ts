import { IDiscussionBoardAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardAdministratorPromotionCollector {
  export async function collect(props: {
    body: IDiscussionBoardAdministratorPromotion.ICreate;
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
      oldGrade: { connect: { id: props.body.old_grade_id } },
      newGrade: { connect: { id: props.body.new_grade_id } },
    } satisfies Prisma.discussion_board_administrator_promotionsCreateInput;
  }
}
