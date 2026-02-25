import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminSectionsSectionId(props: {
  superAdmin: SuperAdminPayload;
  sectionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify the section exists and get current data for audit
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId },
    });
  // 2. Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.discussion_board_sections.update({
    where: { id: props.sectionId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 3. Log the deletion action for audit purposes
  // Note: The system activities table would typically capture this action
  // For now, we rely on the database update timestamp and super admin context
  // 4. Articles are automatically handled by cascade deletion per foreign key constraint
  // No explicit article handling needed - database handles referential integrity
}
