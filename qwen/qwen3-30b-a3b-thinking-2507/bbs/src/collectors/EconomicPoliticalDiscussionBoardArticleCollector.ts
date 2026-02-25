import { IEconomicPoliticalDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardArticle";
import { IEconomicPoliticalDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { EconomicPoliticalDiscussionBoardAttachmentCollector } from "./EconomicPoliticalDiscussionBoardAttachmentCollector";

export namespace EconomicPoliticalDiscussionBoardArticleCollector {
  export async function collect(props: {
    body: IEconomicPoliticalDiscussionBoardArticle.ICreate;
    user: IEntity;
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
      user: { connect: { id: props.user.id } },
      attachments: props.body.attachments?.length
        ? {
            create: await ArrayUtil.asyncMap(
              props.body.attachments,
              (attachment) =>
                EconomicPoliticalDiscussionBoardAttachmentCollector.collect({
                  body: attachment,
                  economicPoliticalDiscussionBoardArticles: {
                    id,
                  },
                }),
            ),
          }
        : undefined,
    } satisfies Prisma.economic_political_discussion_board_articlesCreateInput;
  }
}
