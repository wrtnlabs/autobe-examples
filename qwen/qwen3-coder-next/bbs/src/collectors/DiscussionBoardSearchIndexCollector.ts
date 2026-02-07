import { IDiscussionBoardSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardSearchIndexCollector {
  export async function collect(props: {
    body: IDiscussionBoardSearchIndex.ICreate;
    article: IEntity;
  }) {
    const id: string = v4();
    // Query article to get title and content
    const article =
      await MyGlobal.prisma.discussion_board_articles.findFirstOrThrow({
        where: { id: props.article.id },
      });
    return {
      id,
      title: article.title,
      content: article.content,
      title_trgm: null,
      content_trgm: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      article: { connect: { id: props.article.id } },
    } satisfies Prisma.discussion_board_search_indicesCreateInput;
  }
}
