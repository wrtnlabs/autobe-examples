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
    article: IEntity; // from path parameter articleId
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      tag_name: props.body.tag_name,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relation
      article: { connect: { id: props.article.id } },
    } satisfies Prisma.discussion_board_article_tagsCreateInput;
  }
}
