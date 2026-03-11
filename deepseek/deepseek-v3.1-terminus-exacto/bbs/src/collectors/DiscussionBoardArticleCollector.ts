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
    discussionBoardMembers: IEntity;
    discussionBoardMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      title: props.body.title,
      body: props.body.body,
      status: "published",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      author: { connect: { id: props.discussionBoardMembers.id } },
      section: { connect: { id: props.body.discussion_board_section_id } },
      // HasMany relations - not applicable for creation
      tags: undefined,
      snapshots: undefined,
      viewStats: undefined,
      favorites: undefined,
      reactions: undefined,
      metadatum: undefined,
      comments: undefined,
      commentStatistic: undefined,
      attachments: undefined,
    } satisfies Prisma.discussion_board_articlesCreateInput;
  }
}
