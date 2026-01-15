import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleImageCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticleImage.ICreate;
    discussionBoardArticles: IEntity;
    discussionBoardCitizen: IEntity;
    discussionBoardCitizenSessions: IEntity;
  }) {
    return {
      id: v4(),
      width: props.body.width,
      height: props.body.height,
      mime_type: props.body.mime_type,
      file_size: props.body.size,
      uploaded_at: new Date(),
      file_path: props.body.url,
      thumbnail_path: props.body.thumbnail_url,
      article: {
        connect: { id: props.discussionBoardArticles.id },
      },
    } satisfies Prisma.discussion_board_article_imagesCreateInput;
  }
}
