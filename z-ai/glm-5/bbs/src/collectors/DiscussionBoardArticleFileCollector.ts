import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleFileCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticleFile.ICreate;
    discussionBoardArticles: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      original_filename: props.body.original_filename,
      storage_path: props.body.storage_path,
      file_size: props.body.file_size,
      mime_type: props.body.mime_type,
      created_at: new Date(),
      article: { connect: { id: props.discussionBoardArticles.id } },
    } satisfies Prisma.discussion_board_article_filesCreateInput;
  }
}
