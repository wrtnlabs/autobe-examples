import { IEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomicPoliticalBoardCommentCollector {
  export async function collect(props: {
    body: IEconomicPoliticalBoardComment.ICreate;
    economicPoliticalBoardAdministratorRoles: IEntity;
    economicPoliticalBoardArticles: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      author: {
        connect: { id: props.economicPoliticalBoardAdministratorRoles.id },
      },
      article: {
        connect: { id: props.economicPoliticalBoardArticles.id },
      },
      content: props.body.content,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.economic_political_board_commentsCreateInput;
  }
}
