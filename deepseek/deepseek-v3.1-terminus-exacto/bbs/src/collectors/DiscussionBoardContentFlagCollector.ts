import { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardContentFlagCollector {
  export async function collect(props: {
    body: IDiscussionBoardContentFlag.ICreate;
    discussionBoardUsers: IEntity;
  }) {
    return {
      id: v4(),
      flag_reason: props.body.flag_reason,
      status: "pending",
      resolution_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      resolved_at: null,
      reporter: { connect: { id: props.discussionBoardUsers.id } },
      flaggedArticle: props.body.flagged_article_id
        ? { connect: { id: props.body.flagged_article_id } }
        : undefined,
      flaggedComment: props.body.flagged_comment_id
        ? { connect: { id: props.body.flagged_comment_id } }
        : undefined,
      reviewingAdmin: undefined,
    } satisfies Prisma.discussion_board_content_flagsCreateInput;
  }
}
