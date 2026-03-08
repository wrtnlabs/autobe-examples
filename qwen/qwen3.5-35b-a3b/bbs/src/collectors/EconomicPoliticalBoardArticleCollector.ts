import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticleAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { EconomicPoliticalBoardArticleAttachmentCollector } from "./EconomicPoliticalBoardArticleAttachmentCollector";

export namespace EconomicPoliticalBoardArticleCollector {
  export async function collect(props: {
    body: IEconomicPoliticalBoardArticle.ICreate;
    economicPoliticalBoardAdministratorRoles: IEntity;
    economicPoliticalBoardSections: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      content: props.body.content,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      author: {
        connect: {
          id: props.economicPoliticalBoardAdministratorRoles.id,
        },
      },
      section: {
        connect: {
          id: props.economicPoliticalBoardSections.id,
        },
      },
      attachments: props.body.attachmentData
        ? {
            create: await ArrayUtil.asyncMap(
              props.body.attachmentData,
              (attachment, i) =>
                EconomicPoliticalBoardArticleAttachmentCollector.collect({
                  body: attachment,
                  economicPoliticalBoardArticles: { id },
                }),
            ),
          }
        : undefined,
      comments: undefined,
      articleTags: props.body.tagIds
        ? {
            create: props.body.tagIds.map((tagId, i) => ({
              id: v4(),
              sequence: i,
              created_at: new Date(),
              updated_at: new Date(),
              article: {
                connect: {
                  id,
                },
              },
              tag: {
                connect: {
                  id: tagId,
                },
              },
            })),
          }
        : undefined,
    } satisfies Prisma.economic_political_board_articlesCreateInput;
  }
}
