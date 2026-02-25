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
    discussionBoardUsers: IEntity;
    discussionBoardArticles: IEntity;
  }) {
    return {
      id: v4(),
      created_at: new Date(),
      user: { connect: { id: props.discussionBoardUsers.id } },
      article: { connect: { id: props.discussionBoardArticles.id } },
    } satisfies Prisma.discussion_board_article_favoritesCreateInput;
  }
}
