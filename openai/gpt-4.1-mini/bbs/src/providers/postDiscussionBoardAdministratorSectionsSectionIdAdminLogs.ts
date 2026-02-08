import { IDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdminLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSectionAdminLogCollector } from "../collectors/DiscussionBoardSectionAdminLogCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdministratorSectionsSectionIdAdminLogs(props: {
  administrator: AdministratorPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionAdminLog.ICreate;
}): Promise<IDiscussionBoardSectionAdminLog> {
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.sectionId },
    select: { id: true },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  // Extract required fields from body explicitly
  const { action_type, note = null } = props.body as {
    action_type: string;
    note?: string | null;
  };
  const data = await DiscussionBoardSectionAdminLogCollector.collect({
    body: { action_type, note },
    administrator: props.administrator,
    section: { id: props.sectionId },
  });
  const created =
    await MyGlobal.prisma.discussion_board_section_admin_logs.create({
      data,
      select: {
        id: true,
        administrator_id: true,
        section_id: true,
        action_type: true,
        note: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    id: created.id,
    administrator_id: created.administrator_id,
    section_id: created.section_id,
    action_type: created.action_type,
    note: created.note ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
