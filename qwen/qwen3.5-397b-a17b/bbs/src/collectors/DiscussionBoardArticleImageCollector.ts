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
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      size: props.body.size,
      type: props.body.type,
      url: props.body.url,
      width: props.body.width,
      height: props.body.height,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      article: { connect: { id: props.discussionBoardArticles.id } },
    } satisfies Prisma.discussion_board_article_imagesCreateInput;
  }
}
