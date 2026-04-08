import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeEmployeeDashboardSummaryTransformer } from "../transformers/ErpHrmTimeEmployeeDashboardSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeMemberEmployeesEmployeeId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IErpHrmTimeEmployeeDashboardSummary.IUpdate;
}): Promise<IErpHrmTimeEmployeeDashboardSummary> {
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const current = await prisma.erp_hrm_time_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
        erp_hrm_time_member_id: true,
      },
    });
    if (current.erp_hrm_time_member_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (props.body.erp_hrm_time_department_id !== undefined) {
      if (props.body.erp_hrm_time_department_id !== null) {
        await prisma.erp_hrm_time_departments.findFirstOrThrow({
          where: {
            id: props.body.erp_hrm_time_department_id,
            erp_hrm_time_organization_id: current.erp_hrm_time_organization_id,
            deleted_at: null,
          },
          select: { id: true },
        });
      }
    }
    if (props.body.erp_hrm_time_role_id !== undefined) {
      await prisma.erp_hrm_time_roles.findFirstOrThrow({
        where: {
          id: props.body.erp_hrm_time_role_id,
          erp_hrm_time_organization_id: current.erp_hrm_time_organization_id,
          deleted_at: null,
        },
        select: { id: true },
      });
    }
    if (props.body.employment_type !== undefined) {
      if (
        props.body.employment_type !== "full-time" &&
        props.body.employment_type !== "part-time" &&
        props.body.employment_type !== "contractor" &&
        props.body.employment_type !== "intern"
      ) {
        throw new HttpException("Invalid employment type", 400);
      }
    }
    if (props.body.status !== undefined) {
      if (
        props.body.status !== "active" &&
        props.body.status !== "deactivated"
      ) {
        throw new HttpException("Invalid employee status", 400);
      }
      if (current.erp_hrm_time_member_id !== props.member.id) {
        throw new HttpException("Forbidden", 403);
      }
    }
    const employee = await prisma.erp_hrm_time_employees.update({
      where: { id: props.employeeId },
      data: {
        ...(props.body.erp_hrm_time_department_id !== undefined
          ? {
              erp_hrm_time_department_id: props.body.erp_hrm_time_department_id,
            }
          : {}),
        ...(props.body.position_title !== undefined
          ? { position_title: props.body.position_title }
          : {}),
        ...(props.body.employment_type !== undefined
          ? { employment_type: props.body.employment_type }
          : {}),
        ...(props.body.erp_hrm_time_role_id !== undefined
          ? { erp_hrm_time_role_id: props.body.erp_hrm_time_role_id }
          : {}),
        ...(props.body.status !== undefined
          ? { status: props.body.status }
          : {}),
        updated_at: new Date(),
      },
      ...ErpHrmTimeEmployeeDashboardSummaryTransformer.select(),
    });
    return await ErpHrmTimeEmployeeDashboardSummaryTransformer.transform(
      employee,
    );
  });
}
