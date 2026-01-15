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
    article: IEntity;
  }) {
    const id = v4();
    return {
      id,
      url: "",
      width: 0,
      height: 0,
      mime_type: props.body.mimetype,
      size: props.body.size,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      article: {
        connect: { id: props.article.id },
      },
    } satisfies Prisma.discussion_board_article_imagesCreateInput;
  }
}
