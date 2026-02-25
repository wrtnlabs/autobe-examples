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
    article: IEntity;
  }) {
    return {
      id: v4(),
      attachment_file_id: props.body.attachment_file_id,
      status: "active",
      display_order: props.body.display_order,
      alt_text: props.body.alt_text ?? null,
      caption: props.body.caption ?? null,
      article: { connect: { id: props.article.id } },
    } satisfies Prisma.discussion_board_article_imagesCreateInput;
  }
}
