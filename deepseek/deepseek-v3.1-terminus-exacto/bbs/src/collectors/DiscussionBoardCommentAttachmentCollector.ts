import { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardCommentAttachmentCollector {
  export async function collect(props: {
    body: IDiscussionBoardCommentAttachment.ICreate;
    discussionBoardComments: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      comment: { connect: { id: props.discussionBoardComments.id } },
      file: { connect: { id: props.body.discussion_board_article_file_id } },
    } satisfies Prisma.discussion_board_comment_attachmentsCreateInput;
  }
}
