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
    discussionBoardSections: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title ?? "",
      content: props.body.content ?? "",
      view_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      author: { connect: { id: props.discussionBoardMembers.id } },
      section: { connect: { id: props.discussionBoardSections.id } },
      discussion_board_article_files: undefined,
      discussion_board_article_images: undefined,
      discussion_board_article_tags: undefined,
      discussion_board_comments: undefined,
      discussion_board_search_results: undefined,
      discussion_board_search_indices: undefined,
    } satisfies Prisma.discussion_board_articlesCreateInput;
  }
}
