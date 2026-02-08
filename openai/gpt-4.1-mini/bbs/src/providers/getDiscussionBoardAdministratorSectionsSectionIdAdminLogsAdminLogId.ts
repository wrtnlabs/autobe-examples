import { IDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdminLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdministratorSectionsSectionIdAdminLogsAdminLogId(props: {
  administrator: AdministratorPayload;
  sectionId: string & tags.Format<"uuid">;
  adminLogId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSectionAdminLog> {
  const log =
    await MyGlobal.prisma.discussion_board_section_admin_logs.findFirst({
      where: {
        id: props.adminLogId,
        section_id: props.sectionId,
        deleted_at: null,
      },
      include: {
        administrator: true,
        section: true,
      },
    });
  if (log === null) {
    throw new HttpException("Admin log not found", 404);
  }
  if (log.section === null) {
    throw new HttpException("Section not found", 404);
  }
  // Permission check can be enhanced here if needed; assuming prior authorization
  return {
    id: log.id,
    administrator_id: log.administrator_id,
    section_id: log.section_id,
    action_type: log.action_type,
    note: log.note === null ? null : log.note,
    created_at: toISOStringSafe(log.created_at),
    updated_at:
      log.updated_at === null ? null : toISOStringSafe(log.updated_at),
    deleted_at:
      log.deleted_at === null ? null : toISOStringSafe(log.deleted_at),
  };
}
