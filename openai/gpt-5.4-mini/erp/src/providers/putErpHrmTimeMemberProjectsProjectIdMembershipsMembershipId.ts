import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProjectMembership";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeProjectMembershipTransformer } from "../transformers/ErpHrmTimeProjectMembershipTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeMemberProjectsProjectIdMembershipsMembershipId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  membershipId: string & tags.Format<"uuid">;
  body: IErpHrmTimeProjectMembership.IUpdate;
}): Promise<IErpHrmTimeProjectMembership> {
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    const membership =
      await prisma.erp_hrm_time_project_memberships.findUniqueOrThrow({
        where: { id: props.membershipId },
        select: {
          id: true,
          erp_hrm_time_project_id: true,
          erp_hrm_time_employee_id: true,
          project_role: true,
          project: {
            select: {
              id: true,
              erp_hrm_time_organization_id: true,
            },
          },
        },
      });
    if (membership.erp_hrm_time_project_id !== props.projectId) {
      throw new HttpException("Not Found", 404);
    }
    const project = await prisma.erp_hrm_time_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
      },
    });
    const employee =
      props.body.erp_hrm_time_employee_id === undefined
        ? null
        : await prisma.erp_hrm_time_employees.findUniqueOrThrow({
            where: { id: props.body.erp_hrm_time_employee_id },
            select: {
              id: true,
              erp_hrm_time_organization_id: true,
            },
          });
    if (
      employee !== null &&
      employee.erp_hrm_time_organization_id !==
        project.erp_hrm_time_organization_id
    ) {
      throw new HttpException("Forbidden", 403);
    }
    const nextEmployeeId =
      props.body.erp_hrm_time_employee_id ??
      membership.erp_hrm_time_employee_id;
    const duplicate = await prisma.erp_hrm_time_project_memberships.findFirst({
      where: {
        erp_hrm_time_project_id: props.projectId,
        erp_hrm_time_employee_id: nextEmployeeId,
        id: { not: props.membershipId },
        deleted_at: null,
      },
      select: { id: true },
    });
    if (duplicate !== null) {
      throw new HttpException("Conflict", 409);
    }
    await prisma.erp_hrm_time_project_memberships.update({
      where: { id: props.membershipId },
      data: {
        ...(props.body.erp_hrm_time_employee_id !== undefined && {
          erp_hrm_time_employee_id: props.body.erp_hrm_time_employee_id,
        }),
        ...(props.body.project_role !== undefined && {
          project_role: props.body.project_role,
        }),
        updated_at: new Date(),
      },
      select: { id: true },
    });
    return await prisma.erp_hrm_time_project_memberships.findUniqueOrThrow({
      where: { id: props.membershipId },
      ...ErpHrmTimeProjectMembershipTransformer.select(),
    });
  });
  return await ErpHrmTimeProjectMembershipTransformer.transform(updated);
}
