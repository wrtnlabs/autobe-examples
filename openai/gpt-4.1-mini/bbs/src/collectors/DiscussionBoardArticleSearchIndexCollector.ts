import { IDiscussionBoardArticleSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSearchIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleSearchIndexCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticleSearchIndex.ICreate;
    article: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: "", // DTO doesn't provide title - fallback empty string
      body: "", // DTO doesn't provide body - fallback empty string
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      article: { connect: { id: props.article.id } },
    } satisfies Prisma.discussion_board_article_search_indexesCreateInput;
  }
}
