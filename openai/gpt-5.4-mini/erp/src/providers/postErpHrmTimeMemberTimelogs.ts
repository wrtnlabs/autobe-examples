import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTimelogCollector } from "../collectors/ErpHrmTimeTimelogCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTimelogTransformer } from "../transformers/ErpHrmTimeTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberTimelogs(props: {
  member: MemberPayload;
  body: IErpHrmTimeTimelog.ICreate;
}): Promise<IErpHrmTimeTimelog> {
  const member = await MyGlobal.prisma.erp_hrm_time_members.findUniqueOrThrow({
    where: {
      id: props.member.id,
    },
    select: {
      id: true,
    },
  });
  const organizationMemberships =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findMany({
      where: {
        erp_hrm_time_member_id: member.id,
      },
      select: {
        erp_hrm_time_organization_id: true,
      },
      take: 1,
    });
  if (organizationMemberships.length === 0)
    throw new HttpException("No active organization context", 403);
  const organizationId =
    organizationMemberships[0].erp_hrm_time_organization_id;
  const projectMembership =
    await MyGlobal.prisma.erp_hrm_time_project_memberships.findFirst({
      where: {
        erp_hrm_time_employee_id: member.id,
      },
      select: {
        id: true,
      },
    });
  if (projectMembership === null) throw new HttpException("Forbidden", 403);
  const project = await MyGlobal.prisma.erp_hrm_time_projects.findFirstOrThrow({
    where: {
      id: props.body.projectId,
      erp_hrm_time_organization_id: organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (project.status === "archived" || project.status === "completed") {
    throw new HttpException("Project closed", 400);
  }
  if (props.body.taskId !== undefined && props.body.taskId !== null) {
    await MyGlobal.prisma.erp_hrm_time_tasks.findFirstOrThrow({
      where: {
        id: props.body.taskId,
        erp_hrm_time_project_id: project.id,
        deleted_at: null,
      },
    });
  }
  const created = await MyGlobal.prisma.erp_hrm_time_timelogs.create({
    data: await ErpHrmTimeTimelogCollector.collect({
      body: props.body,
      member: {
        id: member.id,
      },
    }),
    ...ErpHrmTimeTimelogTransformer.select(),
  });
  return await ErpHrmTimeTimelogTransformer.transform(created);
}
