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

export async function deleteDiscussionBoardAdministratorSectionsSectionIdAdminLogsAdminLogId(props: {
  administrator: AdministratorPayload;
  sectionId: string & tags.Format<"uuid">;
  adminLogId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Attempt to delete the admin log entry matching both adminLogId and sectionId
  const deletedCount =
    await MyGlobal.prisma.discussion_board_section_admin_logs.deleteMany({
      where: {
        id: props.adminLogId,
        section_id: props.sectionId,
      },
    });
  // If no record was deleted, throw 404 error indicating not found
  if (deletedCount.count === 0) {
    throw new HttpException("Admin log not found", 404);
  }
}
