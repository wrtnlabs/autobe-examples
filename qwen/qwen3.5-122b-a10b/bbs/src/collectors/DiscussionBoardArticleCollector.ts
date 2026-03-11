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
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      title: props.body.title,
      body: props.body.body,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      section: {
        connect: { id: props.body.discussion_board_section_id },
      },
      member: {
        connect: { id: props.discussionBoardMembers.id },
      },
      articleTags:
        props.body.tagIds && props.body.tagIds.length > 0
          ? {
              create: await ArrayUtil.asyncMap(
                props.body.tagIds,
                async (tagId) => ({
                  id: v4(),
                  discussion_board_article_id: id,
                  discussion_board_tag_id: tagId,
                  created_at: now,
                  updated_at: now,
                  deleted_at: null,
                }),
              ),
            }
          : undefined,
    } satisfies Prisma.discussion_board_articlesCreateInput;
  }
}
