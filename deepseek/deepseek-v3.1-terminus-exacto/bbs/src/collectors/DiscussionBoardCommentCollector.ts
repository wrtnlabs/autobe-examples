import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardCommentCollector {
  export async function collect(props: {
    body: IDiscussionBoardComment.ICreate;
    discussionBoardArticles: IEntity; // from path parameter articleId
    discussionBoardMembers: IEntity; // from authorized actor
    discussionBoardMemberSessions: IEntity; // from authorized session
  }) {
    const id: string = v4();
    return {
      id,
      content: props.body.content,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      author: { connect: { id: props.discussionBoardMembers.id } },
      article: { connect: { id: props.discussionBoardArticles.id } },
    } satisfies Prisma.discussion_board_commentsCreateInput;
  }
}
