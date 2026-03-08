import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { DiscussionBoardArticleAttachmentCollector } from "./DiscussionBoardArticleAttachmentCollector";

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
      member: { connect: { id: props.discussionBoardMembers.id } },
      section: { connect: { id: props.body.section_id } },
      articleTags: props.body.tag_ids?.length
        ? {
            create: await ArrayUtil.asyncMap(props.body.tag_ids, (tagId) =>
              Promise.resolve({
                id: v4(),
                tag: { connect: { id: tagId } },
                created_at: new Date(),
              }),
            ),
          }
        : undefined,
      attachments: props.body.attachments?.length
        ? {
            create: await ArrayUtil.asyncMap(
              props.body.attachments,
              (attachment) =>
                DiscussionBoardArticleAttachmentCollector.collect({
                  body: attachment,
                  discussionBoardArticles: { id },
                }),
            ),
          }
        : undefined,
    } satisfies Prisma.discussion_board_articlesCreateInput;
  }
}
