import { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleCommentCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticleComment.ICreate;
    author: IEntity; // from authorized actor
    article: IEntity; // from article context
  }) {
    const id: string = v4();
    return {
      id,
      content: props.body.content,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      author: { connect: { id: props.author.id } },
      article: { connect: { id: props.article.id } },
    } satisfies Prisma.discussion_board_commentsCreateInput;
  }
}
