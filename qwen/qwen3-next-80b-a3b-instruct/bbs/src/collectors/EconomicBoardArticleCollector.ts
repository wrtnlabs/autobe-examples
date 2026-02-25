import { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomicBoardArticleCollector {
  export async function collect(props: {
    body: IEconomicBoardArticle.ICreate;
    economicBoardCitizens: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      title: props.body.title,
      content: props.body.content,
      created_at: now,
      updated_at: now,
      is_deleted: false,
      section: { connect: { id: props.body.section_id } },
      author: { connect: { id: props.economicBoardCitizens.id } },
      articleTags: props.body.tags?.length
        ? {
            create: props.body.tags.map((tag, i) => ({
              id: v4(),
              tag: tag,
              sequence: i,
              created_at: now,
            })),
          }
        : undefined,
      attachments: props.body.attachment_ids?.length
        ? {
            create: props.body.attachment_ids.map((attachmentId, i) => ({
              id: v4(),
              attachment_id: attachmentId,
              sequence: i,
              file_url: "",
              file_name: "",
              file_type: "",
              file_size: 0,
              created_at: now,
              updated_at: now,
            })),
          }
        : undefined,
      comments: undefined,
      snapshots: undefined,
      views: undefined,
    } satisfies Prisma.economic_board_articlesCreateInput;
  }
}
