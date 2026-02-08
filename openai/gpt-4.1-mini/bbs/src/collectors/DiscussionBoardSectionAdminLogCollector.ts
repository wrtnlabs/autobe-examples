import { IDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdminLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

function toISOStringSafe(date: Date): string {
  return date.toISOString();
}
export namespace DiscussionBoardSectionAdminLogCollector {
  export async function collect(props: {
    body: IDiscussionBoardSectionAdminLog.ICreate & {
      action_type: string;
      note: string | null;
    };
    administrator: IEntity;
    section: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      action_type: props.body.action_type,
      note: props.body.note,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
      administrator: { connect: { id: props.administrator.id } },
      section: { connect: { id: props.section.id } },
    } satisfies Prisma.discussion_board_section_admin_logsCreateInput;
  }
}
