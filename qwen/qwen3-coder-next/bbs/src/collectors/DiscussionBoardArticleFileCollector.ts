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
    discussionBoardArticle: IEntity;
    filePath: string;
    fileSize: number;
  }) {
    return {
      id: v4(),
      original_filename: props.body.originalFilename,
      file_path: props.filePath,
      mime_type: props.body.mimeType,
      file_size: props.fileSize,
      article: { connect: { id: props.discussionBoardArticle.id } },
    } satisfies Prisma.discussion_board_article_filesCreateInput;
  }
}
