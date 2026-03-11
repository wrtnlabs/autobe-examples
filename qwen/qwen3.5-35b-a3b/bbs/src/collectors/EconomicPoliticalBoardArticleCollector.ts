import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { EconomicPoliticalBoardAttachmentCollector } from "./EconomicPoliticalBoardAttachmentCollector";

export namespace EconomicPoliticalBoardArticleCollector {
  export async function collect(props: {
    body: IEconomicPoliticalBoardArticle.ICreate;
    economicPoliticalBoardAdministratorRoles: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      title: props.body.title,
      content: props.body.content,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      author: {
        connect: { id: props.economicPoliticalBoardAdministratorRoles.id },
      },
      section: {
        connect: { id: props.body.sectionId },
      },
      attachments: props.body.attachments?.length
        ? {
            create: await ArrayUtil.asyncMap(
              props.body.attachments,
              (attachment) =>
                EconomicPoliticalBoardAttachmentCollector.collect({
                  body: attachment,
                  economicPoliticalBoardArticles: { id },
                }),
            ),
          }
        : undefined,
      comments: undefined,
      articleTags: props.body.tags?.length
        ? {
            create: await ArrayUtil.asyncMap(props.body.tags, (tagName) => ({
              article: { connect: { id } },
              tag: {
                connectOrCreate: {
                  where: { name: tagName.toLowerCase() },
                  create: { name: tagName.toLowerCase() },
                },
              },
            })),
          }
        : undefined,
    } satisfies Prisma.economic_political_board_articlesCreateInput;
  }
}
