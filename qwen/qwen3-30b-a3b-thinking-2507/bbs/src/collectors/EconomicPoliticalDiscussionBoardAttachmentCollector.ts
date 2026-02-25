import { IEconomicPoliticalDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomicPoliticalDiscussionBoardAttachmentCollector {
  export async function collect(props: {
    body: IEconomicPoliticalDiscussionBoardAttachment.ICreate;
    economicPoliticalDiscussionBoardArticles: IEntity;
  }) {
    return {
      id: v4(),
      url: props.body.url,
      type: props.body.type,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      article: {
        connect: { id: props.economicPoliticalDiscussionBoardArticles.id },
      },
    } satisfies Prisma.economic_political_discussion_board_attachmentsCreateInput;
  }
}
