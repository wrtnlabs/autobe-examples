import { IDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStatEvent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleViewStatEventCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticleViewStatEvent.ICreate;
    discussionBoardArticles: IEntity;
    discussionBoardUserSessions: IEntity;
  }) {
    return {
      id: v4(),
      created_at: new Date(),
      view_duration_seconds: props.body.view_duration_seconds ?? null,
      article: { connect: { id: props.discussionBoardArticles.id } },
      userSession: props.discussionBoardUserSessions.id
        ? { connect: { id: props.discussionBoardUserSessions.id } }
        : undefined,
    } satisfies Prisma.discussion_board_article_view_stat_eventsCreateInput;
  }
}
