import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdminSectionsSectionId(props: {
  admin: AdminPayload;
  sectionId: string;
}): Promise<void> {
  const now = toISOStringSafe(new Date());
  // Check if section exists and is not already deleted
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.sectionId as string & tags.Format<"uuid"> },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  // Perform soft delete
  await MyGlobal.prisma.discussion_board_sections.update({
    where: { id: props.sectionId as string & tags.Format<"uuid"> },
    data: { deleted_at: now },
  });
  // Log administrative action
  await MyGlobal.prisma.discussion_board_system_logs.create({
    data: {
      id: v4(),
      actor_id: props.admin.id,
      actor_session_id: props.admin.session_id,
      event_type: "SECTION_DELETED",
      severity: "medium",
      target_id: props.sectionId,
      target_type: "section",
      description: JSON.stringify({
        section_id: props.sectionId,
      }),
      created_at: now,
      updated_at: now,
    },
  });
}
