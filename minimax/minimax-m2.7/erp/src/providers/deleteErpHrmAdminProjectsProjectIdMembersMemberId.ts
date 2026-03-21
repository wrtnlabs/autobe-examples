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

export async function deleteErpHrmAdminProjectsProjectIdMembersMemberId(props: {
  admin: AdminPayload;
  projectId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the project exists
  await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true },
  });
  // Verify the member belongs to the project
  await MyGlobal.prisma.erp_hrm_project_members.findUniqueOrThrow({
    where: {
      id: props.memberId,
      erp_hrm_project_id: props.projectId,
    },
    select: {
      id: true,
      erp_hrm_project_id: true,
    },
  });
  // Delete the project membership
  await MyGlobal.prisma.erp_hrm_project_members.delete({
    where: {
      id: props.memberId,
    },
  });
}
