import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProjectMembership";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingProject";
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

export async function patchErpHrmTimeTrackingMemberProjectsAssigned(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingProjectMembership.IRequest;
}): Promise<IPageIErpHrmTimeTrackingProject.ISummary> {
  const organizationId = props.member.session_id; // placeholder
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const [items, records] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.erp_hrm_time_tracking_project_memberships.findMany({
      where: {
        employee_id: props.member.id,
        deleted_at: null,
        project: {
          deleted_at: null,
          erp_hrm_time_tracking_organization_id: organizationId as any,
        },
      },
      select: {
        id: true,
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            status: true,
            erp_hrm_time_tracking_organization_id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
      orderBy: { id: "asc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.erp_hrm_time_tracking_project_memberships.count({
      where: {
        employee_id: props.member.id,
        deleted_at: null,
        project: {
          deleted_at: null,
          erp_hrm_time_tracking_organization_id: organizationId as any,
        },
      },
    }),
  ]);
  const pages = records === 0 ? 0 : Math.ceil(records / limit);
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages,
    },
    data: items.map((m) => {
      const p = m.project;
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        status: p.status,
        erp_hrm_time_tracking_organization_id:
          p.erp_hrm_time_tracking_organization_id,
        created_at: p.created_at.toISOString() as any,
        updated_at: p.updated_at.toISOString() as any,
        deleted_at: p.deleted_at ? (p.deleted_at.toISOString() as any) : null,
      };
    }),
  };
}
