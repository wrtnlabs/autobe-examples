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
    article: IEntity;
  }) {
    return {
      id: v4(),
      file_type: props.body.mime_type,
      file_size: props.body.size,
      display_name: props.body.name,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      article: {
        connect: {
          id: props.article.id,
        },
      },
    } satisfies Prisma.discussion_board_article_filesCreateInput;
  }
}
