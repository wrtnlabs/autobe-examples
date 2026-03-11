import { IDiscussionBoardArticleReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleReaction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleReactionCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticleReaction.ICreate;
    member: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      reaction_type: props.body.reaction_type,
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relations
      article: { connect: { id: props.body.discussion_board_article_id } },
      member: { connect: { id: props.member.id } },
    } satisfies Prisma.discussion_board_article_reactionsCreateInput;
  }
}
