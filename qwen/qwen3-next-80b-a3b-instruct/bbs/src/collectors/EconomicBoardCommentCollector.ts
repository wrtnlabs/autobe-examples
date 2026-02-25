import { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomicBoardCommentCollector {
  export async function collect(props: {
    body: IEconomicBoardComment.ICreate;
    economicBoardArticles: IEntity;
    economicBoardCitizens: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      content: props.body.content,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      article: { connect: { id: props.economicBoardArticles.id } },
      author: { connect: { id: props.economicBoardCitizens.id } },
    } satisfies Prisma.economic_board_commentsCreateInput;
  }
}
