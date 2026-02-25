import { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleDraftCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticleDraft.ICreate;
  }) {
    return {
      // Scalar fields
      id: v4(),
      draft_title: props.body.draft_title,
      draft_content: props.body.draft_content,
      draft_status: props.body.draft_status,
      last_saved_at: new Date(),
      recovery_data: props.body.recovery_data
        ? JSON.stringify(props.body.recovery_data)
        : null,
      draft_created_at: new Date(),
      draft_updated_at: new Date(),
      draft_deleted_at: null,
      // Optional relation - not applicable for draft creation
      article: undefined,
    } satisfies Prisma.discussion_board_article_draftsCreateInput;
  }
}
