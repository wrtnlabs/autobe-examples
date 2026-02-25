import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSuperAdminTransformer } from "../transformers/DiscussionBoardSuperAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminSectionsSectionIdAdministratorsAssignmentId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSuperAdmin> {
  // Verify the section exists and is not deleted
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: {
      id: props.sectionId,
      deleted_at: null,
    },
  });
  // Retrieve the assignment with transformer select
  const assignment =
    await MyGlobal.prisma.discussion_board_section_administrators.findUniqueOrThrow(
      {
        where: {
          id: props.assignmentId,
          discussion_board_section_id: props.sectionId,
          deleted_at: null,
        },
        ...DiscussionBoardSuperAdminTransformer.select(),
      },
    );
  // Authorization: Super admin can view all assignments, regular admin must be assigned to this section
  // Since the admin payload comes from adminAuthorize which ensures admin exists, we need to check permissions
  const isAssignedToSection =
    await MyGlobal.prisma.discussion_board_section_administrators.findFirst({
      where: {
        OR: [
          { discussion_board_admin_id: props.admin.id },
          { discussion_board_super_admin_id: props.admin.id },
        ],
        discussion_board_section_id: props.sectionId,
        deleted_at: null,
      },
    });
  if (!isAssignedToSection) {
    // Regular admin not assigned to this section
    throw new HttpException("Forbidden", 403);
  }
  // Transform using the transformer
  return await DiscussionBoardSuperAdminTransformer.transform(assignment);
}
