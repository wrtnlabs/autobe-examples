import { IEconomyPoliticsBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomyPoliticsBoardArticleCollector {
  export async function collect(props: {
    body: IEconomyPoliticsBoardArticle.ICreate;
    economyPoliticsBoardUsers: IEntity;
  }) {
    const id = v4();
    return {
      id,
      title: props.body.title,
      content: props.body.content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      section: { connect: { id: props.body.section_id } },
      author: { connect: { id: props.economyPoliticsBoardUsers.id } },
    } satisfies Prisma.economy_politics_board_articlesCreateInput;
  }
}
