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

export async function deleteDiscussionBoardAdminAttachmentCategoryMappingsMappingId(props: {
  admin: AdminPayload;
  mappingId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify admin account exists and is active
  const adminAccount =
    await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
      where: { id: props.admin.id, deleted_at: null },
    });
  // Check if mapping exists before deletion
  const mapping =
    await MyGlobal.prisma.discussion_board_attachment_category_mappings.findUniqueOrThrow(
      {
        where: { id: props.mappingId },
      },
    );
  // Delete the mapping
  await MyGlobal.prisma.discussion_board_attachment_category_mappings.delete({
    where: { id: props.mappingId },
  });
}
