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
    discussionBoardArticles: IEntity;
    discussionBoardMembers: IEntity;
    discussionBoardMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      content: props.body.content,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      article: { connect: { id: props.discussionBoardArticles.id } },
      author: { connect: { id: props.discussionBoardMembers.id } },
    } satisfies Prisma.discussion_board_commentsCreateInput;
  }
}
