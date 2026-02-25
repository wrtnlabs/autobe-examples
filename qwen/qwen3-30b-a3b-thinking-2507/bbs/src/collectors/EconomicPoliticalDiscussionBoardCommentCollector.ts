import { IEconomicPoliticalDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomicPoliticalDiscussionBoardCommentCollector {
  export async function collect(props: {
    body: IEconomicPoliticalDiscussionBoardComment.ICreate;
    economicPoliticalDiscussionBoardArticles: IEntity;
    economicPoliticalDiscussionBoardUsers: IEntity;
  }) {
    const id = v4();
    return {
      id,
      content: props.body.content,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      article: {
        connect: { id: props.economicPoliticalDiscussionBoardArticles.id },
      },
      user: { connect: { id: props.economicPoliticalDiscussionBoardUsers.id } },
    } satisfies Prisma.economic_political_discussion_board_commentsCreateInput;
  }
}
