import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminAdministratorAssignmentsAssignmentId(props: {
  superAdmin: SuperadminPayload;
  assignmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First, verify the assignment exists using findUniqueOrThrow
  await MyGlobal.prisma.discussion_board_administrator_assignments.findUniqueOrThrow(
    {
      where: { id: props.assignmentId },
    },
  );
  // Perform soft deletion by setting deleted_at timestamp
  await MyGlobal.prisma.discussion_board_administrator_assignments.update({
    where: { id: props.assignmentId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
