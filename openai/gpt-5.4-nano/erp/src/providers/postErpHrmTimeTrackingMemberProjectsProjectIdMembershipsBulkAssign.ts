import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProjectMembership";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingMemberProjectsProjectIdMembershipsBulkAssign(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingProjectMembership.ICreate;
}): Promise<IErpHrmTimeTrackingProjectMembership> {
  const row =
    await MyGlobal.prisma.erp_hrm_time_tracking_project_memberships.findUniqueOrThrow(
      {
        where: {
          project_id_employee_id: {
            project_id: props.projectId,
            employee_id: props.body.employee_id,
          },
        },
        include: {
          project: true,
          employee: true,
        },
      },
    );
  return {
    ...row,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at === null ? null : toISOStringSafe(row.deleted_at),
    project: {
      ...row.project,
      created_at: toISOStringSafe(row.project.created_at),
      updated_at: toISOStringSafe(row.project.updated_at),
      deleted_at:
        row.project.deleted_at === null
          ? null
          : toISOStringSafe(row.project.deleted_at),
    },
    employee: {
      ...row.employee,
      created_at: toISOStringSafe(row.employee.created_at),
      updated_at: toISOStringSafe(row.employee.updated_at),
      deleted_at:
        row.employee.deleted_at === null
          ? null
          : toISOStringSafe(row.employee.deleted_at),
    },
  };
}
