import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticle.ICreate;
    actor: IEntity;
    section: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      content: props.body.content,
      created_at: new Date(),
      updated_at: null,
      deleted_at: null,
      author: { connect: { id: props.actor.id } },
      section: { connect: { id: props.section.id } },
    } satisfies Prisma.discussion_board_articlesCreateInput;
  }
}
