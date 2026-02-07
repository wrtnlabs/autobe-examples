import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleTagCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticleTag.ICreate;
    discussionBoardArticle: IEntity;
    discussionBoardTag: IEntity;
  }) {
    return {
      id: v4(),
      created_at: new Date(),
      article: { connect: { id: props.discussionBoardArticle.id } },
      tag: { connect: { id: props.discussionBoardTag.id } },
    } satisfies Prisma.discussion_board_article_tagsCreateInput;
  }
}
