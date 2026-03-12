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
      id,
      title: props.body.title,
      content: props.body.content,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      section: { connect: { id: props.body.section_id } },
      author: { connect: { id: props.discussionBoardMembers.id } },
      creationSession: {
        connect: { id: props.discussionBoardMemberSessions.id },
      },
      snapshots: undefined,
      views: undefined,
      comments: undefined,
      articleTags: props.body.tags?.length
        ? {
            create: await ArrayUtil.asyncMap(
              props.body.tags,
              async (tagValue) => ({
                id: v4(),
                created_at: new Date(),
                tag: {
                  connectOrCreate: {
                    where: { name: tagValue },
                    create: {
                      id: v4(),
                      name: tagValue,
                      created_at: new Date(),
                      updated_at: new Date(),
                      deleted_at: null,
                    },
                  },
                },
              }),
            ),
          }
        : undefined,
    } satisfies Prisma.discussion_board_articlesCreateInput;
  }
}
