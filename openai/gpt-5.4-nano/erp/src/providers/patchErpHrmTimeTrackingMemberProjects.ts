import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
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

export async function patchErpHrmTimeTrackingMemberProjects(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingProject.IRequest;
}): Promise<IPageIErpHrmTimeTrackingProject.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const status = props.body.status;
  if (
    status !== undefined &&
    status !== "active" &&
    status !== "archived" &&
    status !== "completed"
  ) {
    throw new HttpException("Invalid status", 400);
  }
  const selectedOrganizationId = props.member.id; // placeholder
  const where = {
    erp_hrm_time_tracking_organization_id: selectedOrganizationId,
    deleted_at: null,
    ...(status ? { status } : {}),
  };
  const [items, total] = await Promise.all([
    MyGlobal.prisma.erp_hrm_time_tracking_projects.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: "desc" },
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
    }),
    MyGlobal.prisma.erp_hrm_time_tracking_projects.count({ where }),
  ]);
  return {
    data: items.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      status: p.status,
      erp_hrm_time_tracking_organization_id:
        p.erp_hrm_time_tracking_organization_id,
      created_at: p.created_at.toISOString(),
      updated_at: p.updated_at.toISOString(),
      deleted_at: p.deleted_at === null ? null : p.deleted_at.toISOString(),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
