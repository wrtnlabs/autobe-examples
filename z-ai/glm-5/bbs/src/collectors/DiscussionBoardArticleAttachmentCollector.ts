import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleAttachmentCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticleAttachment.ICreate;
    discussionBoardArticles: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      type: props.body.type,
      name: props.body.name,
      extension: props.body.extension,
      size: props.body.size,
      path: props.body.url,
      created_at: new Date(),
      article: { connect: { id: props.discussionBoardArticles.id } },
    } satisfies Prisma.discussion_board_article_attachmentsCreateInput;
  }
}
