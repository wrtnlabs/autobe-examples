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
    administrator: IEntity;
    oldGrade: IEntity;
    newGrade: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      administrator: { connect: { id: props.administrator.id } },
      oldGrade: { connect: { id: props.oldGrade.id } },
      newGrade: { connect: { id: props.newGrade.id } },
    } satisfies Prisma.discussion_board_administrator_promotionsCreateInput;
  }
}
