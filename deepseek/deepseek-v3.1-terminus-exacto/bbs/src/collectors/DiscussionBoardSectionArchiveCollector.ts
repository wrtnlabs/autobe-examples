import { IDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionArchive";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardSectionArchiveCollector {
  export async function collect(props: {
    body: IDiscussionBoardSectionArchive.ICreate;
    discussionBoardSections: IEntity;
    discussionBoardAdmins: IEntity;
    discussionBoardAdminSessions: IEntity;
  }) {
    return {
      id: v4(),
      archived_at: new Date(),
      archived_by: props.discussionBoardAdmins.id,
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      section: { connect: { id: props.discussionBoardSections.id } },
    } satisfies Prisma.discussion_board_section_archivesCreateInput;
  }
}
