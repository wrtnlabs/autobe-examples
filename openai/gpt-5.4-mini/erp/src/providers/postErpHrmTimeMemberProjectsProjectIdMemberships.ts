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
import { ErpHrmTimeProjectMembershipCollector } from "../collectors/ErpHrmTimeProjectMembershipCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeProjectMembershipTransformer } from "../transformers/ErpHrmTimeProjectMembershipTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberProjectsProjectIdMemberships(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTimeProjectMembership.ICreate;
}): Promise<IErpHrmTimeProjectMembership> {
  if (
    props.body.projectRole !== "member" &&
    props.body.projectRole !== "project-lead"
  ) {
    throw new HttpException("Invalid project role", 400);
  }
  const project = await MyGlobal.prisma.erp_hrm_time_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_time_organization_id: true,
      deleted_at: true,
    },
  });
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow({
      where: {
        id: props.body.erpHrmtimeEmployeeId,
        erp_hrm_time_organization_id: project.erp_hrm_time_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const existing =
    await MyGlobal.prisma.erp_hrm_time_project_memberships.findFirst({
      where: {
        erp_hrm_time_project_id: project.id,
        erp_hrm_time_employee_id: employee.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (existing !== null) {
    throw new HttpException("Project membership already exists", 409);
  }
  const created = await MyGlobal.prisma.erp_hrm_time_project_memberships.create(
    {
      data: await ErpHrmTimeProjectMembershipCollector.collect({
        body: props.body,
        project,
      }),
      ...ErpHrmTimeProjectMembershipTransformer.select(),
    },
  );
  return await ErpHrmTimeProjectMembershipTransformer.transform(created);
}
