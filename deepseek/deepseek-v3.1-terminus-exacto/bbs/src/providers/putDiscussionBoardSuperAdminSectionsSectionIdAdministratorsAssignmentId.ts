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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardSuperAdminTransformer } from "../transformers/DiscussionBoardSuperAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminSectionsSectionIdAdministratorsAssignmentId(props: {
  superAdmin: SuperAdminPayload;
  sectionId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSuperAdmin.IUpdate;
}): Promise<IDiscussionBoardSuperAdmin> {
  // Validate that the assignment exists and belongs to the specified section
  const existingAssignment =
    await MyGlobal.prisma.discussion_board_section_administrators.findFirstOrThrow(
      {
        where: {
          id: props.assignmentId,
          discussion_board_section_id: props.sectionId,
          deleted_at: null,
        },
      },
    );
  // Validate permission_level is provided in the request
  if (props.body.permission_level === undefined) {
    throw new HttpException("Permission level is required for update", 400);
  }
  // Update the assignment with new permission level using proper ISO string format
  await MyGlobal.prisma.discussion_board_section_administrators.update({
    where: { id: props.assignmentId },
    data: {
      permission_level: props.body.permission_level,
      updated_at: new Date().toISOString(),
    },
  });
  // Fetch the updated record with transformer select
  const updated =
    await MyGlobal.prisma.discussion_board_section_administrators.findUniqueOrThrow(
      {
        where: { id: props.assignmentId },
        ...DiscussionBoardSuperAdminTransformer.select(),
      },
    );
  return await DiscussionBoardSuperAdminTransformer.transform(updated);
}
