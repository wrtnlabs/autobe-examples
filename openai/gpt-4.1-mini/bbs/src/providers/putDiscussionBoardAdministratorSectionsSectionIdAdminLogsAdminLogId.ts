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

export async function putDiscussionBoardAdministratorSectionsSectionIdAdminLogsAdminLogId(props: {
  administrator: AdministratorPayload;
  sectionId: string & tags.Format<"uuid">;
  adminLogId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionAdminLog.IUpdate;
}): Promise<IDiscussionBoardSectionAdminLog> {
  const existingLog =
    await MyGlobal.prisma.discussion_board_section_admin_logs.findFirst({
      where: {
        id: props.adminLogId,
        section_id: props.sectionId,
        deleted_at: null,
      },
    });
  if (!existingLog) {
    throw new HttpException("Admin log not found", 404);
  }
  const dataToUpdate: {
    action_type?: Prisma.StringFieldUpdateOperationsInput | undefined;
    note?: Prisma.StringFieldUpdateOperationsInput | undefined;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  if ("actionType" in props.body) {
    dataToUpdate.action_type = { set: props.body.actionType ?? null };
  }
  if ("note" in props.body) {
    dataToUpdate.note = { set: props.body.note ?? null };
  }
  const updatedLog = await MyGlobal.prisma.$transaction(async (tx) => {
    return await tx.discussion_board_section_admin_logs.update({
      where: { id: props.adminLogId },
      data: dataToUpdate,
    });
  });
  return {
    id: updatedLog.id as string & tags.Format<"uuid">,
    section_id: updatedLog.section_id as string & tags.Format<"uuid">,
    action_type: updatedLog.action_type ?? null,
    note: updatedLog.note ?? null,
    created_at: toISOStringSafe(updatedLog.created_at),
    updated_at: toISOStringSafe(updatedLog.updated_at),
    deleted_at: updatedLog.deleted_at
      ? toISOStringSafe(updatedLog.deleted_at)
      : null,
  };
}
