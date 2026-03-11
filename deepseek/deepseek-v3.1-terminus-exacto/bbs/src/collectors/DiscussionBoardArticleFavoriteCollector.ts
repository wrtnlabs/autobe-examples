import { IDiscussionBoardArticleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFavorite";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleFavoriteCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticleFavorite.ICreate;
    discussionBoardMembers: IEntity;
    discussionBoardMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      category: props.body.category ?? null,
      notes: props.body.notes ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.discussionBoardMembers.id } },
      article: { connect: { id: props.body.discussion_board_article_id } },
    } satisfies Prisma.discussion_board_article_favoritesCreateInput;
  }
}
