import { IDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAdministratorAssignmentCollector } from "../collectors/DiscussionBoardAdministratorAssignmentCollector";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAdministratorAssignmentTransformer } from "../transformers/DiscussionBoardAdministratorAssignmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminAdministratorAssignments(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAdministratorAssignment.ICreate;
}): Promise<IDiscussionBoardAdministratorAssignment> {
  // Verify super admin exists (already validated by jwtAuthorize, but ensure soft-delete check)
  await MyGlobal.prisma.discussion_board_super_admins.findUniqueOrThrow({
    where: { id: props.superAdmin.id, deleted_at: null },
  });
  // Create assignment using Collector for write side
  const created =
    await MyGlobal.prisma.discussion_board_administrator_assignments.create({
      data: await DiscussionBoardAdministratorAssignmentCollector.collect({
        body: props.body,
      }),
      ...DiscussionBoardAdministratorAssignmentTransformer.select(),
    });
  // Return transformed response using Transformer
  return await DiscussionBoardAdministratorAssignmentTransformer.transform(
    created,
  );
}
