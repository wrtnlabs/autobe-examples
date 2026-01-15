import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticle.ICreate;
    discussionBoardCitizen: IEntity;
    discussionBoardCitizenSessions: IEntity;
  }) {
    return {
      id: v4(),
      title: props.body.title,
      body: props.body.content,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      author: {
        connect: { id: props.discussionBoardCitizen.id },
      },
      category: undefined,
    } satisfies Prisma.discussion_board_articlesCreateInput;
  }
}
