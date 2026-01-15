import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleFileCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticleFile.ICreate;
    discussionBoardArticles: IEntity;
    discussionBoardCitizen: IEntity;
  }) {
    return {
      id: v4(),
      file_name: props.body.name,
      uploaded_at: props.body.uploaded_at,
      deleted_at: null,
      article: {
        connect: { id: props.discussionBoardArticles.id },
      },
      attachment: {
        connect: { id: props.discussionBoardArticles.id },
      },
    } satisfies Prisma.discussion_board_article_filesCreateInput;
  }
}
