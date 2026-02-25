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

export async function putDiscussionBoardAdminSectionsSectionIdAdministratorsAssignmentId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSuperAdmin.IUpdate;
}): Promise<IDiscussionBoardSuperAdmin> {
  // Find existing assignment record and validate it belongs to the section
  const existingAssignment =
    await MyGlobal.prisma.discussion_board_section_administrators.findUniqueOrThrow(
      {
        where: {
          id: props.assignmentId,
          discussion_board_section_id: props.sectionId,
          deleted_at: null,
        },
      },
    );
  // Update the assignment with conditional permission_level update
  const updateData: any = {
    updated_at: new Date(Date.now()).toISOString(),
  };
  if (props.body.permission_level !== undefined) {
    updateData.permission_level = props.body.permission_level;
  }
  await MyGlobal.prisma.discussion_board_section_administrators.update({
    where: { id: props.assignmentId },
    data: updateData,
  });
  // Retrieve the updated assignment with complete relations
  const updatedAssignment =
    await MyGlobal.prisma.discussion_board_section_administrators.findUniqueOrThrow(
      {
        where: { id: props.assignmentId },
        ...DiscussionBoardSuperAdminTransformer.select(),
      },
    );
  return await DiscussionBoardSuperAdminTransformer.transform(
    updatedAssignment,
  );
}
