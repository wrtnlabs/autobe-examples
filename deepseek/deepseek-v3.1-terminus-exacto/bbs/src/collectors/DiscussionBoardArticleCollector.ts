import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticle.ICreate;
    discussionBoardUsers: IEntity; // from authorized actor
    discussionBoardUserSessions: IEntity; // from authorized session
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      title: props.body.title,
      content: props.body.content,
      status: "draft",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      section: { connect: { id: props.body.discussion_board_section_id } },
      author: { connect: { id: props.discussionBoardUsers.id } },
      // Has relations (empty for creation)
      auditActions: undefined,
      snapshots: undefined,
      files: undefined,
      images: undefined,
      tags: undefined,
      viewStat: undefined,
      favoritedBies: undefined,
      drafts: undefined,
      viewStatEvents: undefined,
      comments: undefined,
      commentPaginationSetting: undefined,
      moderationLogs: undefined,
      moderationHistories: undefined,
      contentFlags: undefined,
    } satisfies Prisma.discussion_board_articlesCreateInput;
  }
}
