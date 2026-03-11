import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleTagCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticleTag.ICreate;
    discussionBoardMembers: IEntity; // from authorized actor
    discussionBoardMemberSessions: IEntity; // from authorized session
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      article: { connect: { id: props.body.discussion_board_article_id } },
    } satisfies Prisma.discussion_board_article_tagsCreateInput;
  }
}
