import { IDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAdministratorAssignmentTransformer } from "../transformers/DiscussionBoardAdministratorAssignmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminAdministratorAssignmentsAssignmentId(props: {
  superAdmin: SuperadminPayload;
  assignmentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorAssignment.IUpdate;
}): Promise<IDiscussionBoardAdministratorAssignment> {
  // 1. Verify the assignment exists
  const assignment =
    await MyGlobal.prisma.discussion_board_administrator_assignments.findUniqueOrThrow(
      {
        where: {
          id: props.assignmentId,
          deleted_at: null, // Only active records
        },
      },
    );
  // 2. Prepare update data - only update provided fields
  const updateData: Prisma.discussion_board_administrator_assignmentsUpdateInput =
    {};
  if (props.body.assignment_type !== undefined) {
    updateData.assignment_type = props.body.assignment_type;
  }
  if (props.body.reason !== undefined) {
    updateData.reason = props.body.reason === null ? null : props.body.reason;
  }
  // Always update timestamp
  updateData.updated_at = new Date();
  // 3. Perform the update
  await MyGlobal.prisma.discussion_board_administrator_assignments.update({
    where: { id: props.assignmentId },
    data: updateData,
  });
  // 4. Fetch the updated record with transformer select
  const updated =
    await MyGlobal.prisma.discussion_board_administrator_assignments.findUniqueOrThrow(
      {
        where: { id: props.assignmentId },
        ...DiscussionBoardAdministratorAssignmentTransformer.select(),
      },
    );
  // 5. Transform and return
  return await DiscussionBoardAdministratorAssignmentTransformer.transform(
    updated,
  );
}
