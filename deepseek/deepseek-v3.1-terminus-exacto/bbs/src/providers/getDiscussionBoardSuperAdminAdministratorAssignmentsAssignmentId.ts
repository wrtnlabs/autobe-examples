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

export async function getDiscussionBoardSuperAdminAdministratorAssignmentsAssignmentId(props: {
  superAdmin: SuperadminPayload;
  assignmentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorAssignment> {
  const assignment =
    await MyGlobal.prisma.discussion_board_administrator_assignments.findUniqueOrThrow(
      {
        where: {
          id: props.assignmentId,
          deleted_at: null,
        },
        ...DiscussionBoardAdministratorAssignmentTransformer.select(),
      },
    );
  return await DiscussionBoardAdministratorAssignmentTransformer.transform(
    assignment,
  );
}
