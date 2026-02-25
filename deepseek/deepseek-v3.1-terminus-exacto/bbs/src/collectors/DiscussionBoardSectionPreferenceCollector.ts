import { IDiscussionBoardSectionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionPreference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardSectionPreferenceCollector {
  export async function collect(props: {
    body: IDiscussionBoardSectionPreference.ICreate;
    discussionBoardUsers: IEntity; // from authorized actor
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      // Scalar fields
      id,
      display_order: props.body.display_order,
      notify_new_articles: props.body.notify_new_articles ?? false,
      notify_new_comments: props.body.notify_new_comments ?? false,
      is_hidden: props.body.is_hidden ?? false,
      created_at: now,
      updated_at: now,
      // BelongsTo relations - use connect syntax
      section: { connect: { id: props.body.discussion_board_section_id } },
      user: { connect: { id: props.discussionBoardUsers.id } },
    } satisfies Prisma.discussion_board_section_preferencesCreateInput;
  }
}
