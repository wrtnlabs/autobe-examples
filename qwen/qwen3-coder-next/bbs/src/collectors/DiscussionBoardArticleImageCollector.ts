import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleImageCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticleImage.ICreate;
    discussionBoardArticles: IEntity;
  }) {
    return {
      id: v4(),
      original_filename: props.body.original_filename,
      stored_path: props.body.file_uri,
      mime_type: props.body.mime_type,
      file_size: props.body.file_size,
      created_at: new Date(),
      article: { connect: { id: props.discussionBoardArticles.id } },
    } satisfies Prisma.discussion_board_article_imagesCreateInput;
  }
}
