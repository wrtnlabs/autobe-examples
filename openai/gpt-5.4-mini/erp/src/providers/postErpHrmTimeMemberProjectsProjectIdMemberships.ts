import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
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
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        erp_hrm_time_organization_id: true,
      },
    });
  if (membership === null) throw new HttpException("Forbidden", 403);
  const project = await MyGlobal.prisma.erp_hrm_time_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow({
      where: {
        id: props.body.employeeId,
        erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  try {
    const created = await MyGlobal.prisma.$transaction(async (tx) => {
      const duplicated = await tx.erp_hrm_time_project_memberships.findUnique({
        where: {
          erp_hrm_time_project_id_erp_hrm_time_employee_id: {
            erp_hrm_time_project_id: project.id,
            erp_hrm_time_employee_id: employee.id,
          },
        },
        select: {
          id: true,
        },
      });
      if (duplicated !== null)
        throw new HttpException("Project membership already exists", 409);
      return await tx.erp_hrm_time_project_memberships.create({
        data: await ErpHrmTimeProjectMembershipCollector.collect({
          body: props.body,
          project: project,
        }),
        ...ErpHrmTimeProjectMembershipTransformer.select(),
      });
    });
    return await ErpHrmTimeProjectMembershipTransformer.transform(created);
  } catch (error) {
    if (error instanceof HttpException) throw error;
    throw new HttpException("Project membership already exists", 409);
  }
}
