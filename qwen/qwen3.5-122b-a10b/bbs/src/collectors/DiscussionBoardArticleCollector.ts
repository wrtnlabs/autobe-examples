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
    discussionBoardMember: IEntity;
    discussionBoardMemberSession: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      body: props.body.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      section: {
        connect: { id: props.body.discussion_board_section_id },
      },
      member: {
        connect: { id: props.discussionBoardMember.id },
      },
      articleTags:
        props.body.tags && props.body.tags.length > 0
          ? {
              create: await ArrayUtil.asyncMap(
                props.body.tags,
                async (tagId) => ({
                  id: v4(),
                  article: {
                    connect: { id },
                  },
                  tag: {
                    connect: { id: tagId },
                  },
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  deleted_at: null,
                }),
              ),
            }
          : undefined,
    } satisfies Prisma.discussion_board_articlesCreateInput;
  }
}
