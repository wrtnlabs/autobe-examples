import { IEconomicPoliticalBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticleAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomicPoliticalBoardArticleAttachmentCollector {
  export async function collect(props: {
    body: IEconomicPoliticalBoardArticleAttachment.ICreate;
    economicPoliticalBoardArticles: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      file_url: props.body.file_url,
      file_name: props.body.file_name,
      file_type: props.body.file_type,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      article: { connect: { id: props.economicPoliticalBoardArticles.id } },
    } satisfies Prisma.economic_political_board_attachmentsCreateInput;
  }
}
