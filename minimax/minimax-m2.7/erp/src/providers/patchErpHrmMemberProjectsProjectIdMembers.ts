import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProjectMember";
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

export async function patchErpHrmMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmProjectMember.IRequest;
}): Promise<IPageIErpHrmProjectMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Validate project exists and get its organization
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true, erp_hrm_organization_id: true },
  });
  // Verify member belongs to the project's organization
  const memberEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: project.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!memberEmployee) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where conditions for filtering (only filters that exist in IRequest)
  const whereConditions: Prisma.erp_hrm_projectsWhereInput = {
    id: props.projectId,
  };
  if (props.body.status) {
    whereConditions.status = props.body.status;
  }
  // Query projects with organization data
  const projects = await MyGlobal.prisma.erp_hrm_projects.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      name: true,
      color: true,
      status: true,
      budget_hours: true,
      start_date: true,
      end_date: true,
      created_at: true,
      organization: {
        select: {
          id: true,
          name: true,
          description: true,
          logo_uri: true,
          currency: true,
          timezone: true,
          fiscal_start_month: true,
          created_at: true,
          owner: {
            select: {
              id: true,
              display_name: true,
              email: true,
              avatar_uri: true,
              phone: true,
              created_at: true,
            },
          },
        },
      },
    },
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.erp_hrm_projects.count({
    where: whereConditions,
  });
  // Transform to response format
  const data = projects.map(
    (p): IErpHrmProjectMember.ISummary => ({
      id: p.id as string & tags.Format<"uuid">,
      name: p.name,
      color: p.color,
      status: p.status,
      budget_hours: p.budget_hours ?? undefined,
      start_date:
        p.start_date !== null
          ? (p.start_date.toISOString() as string & tags.Format<"date-time">)
          : undefined,
      end_date:
        p.end_date !== null
          ? (p.end_date.toISOString() as string & tags.Format<"date-time">)
          : undefined,
      created_at: p.created_at.toISOString() as string &
        tags.Format<"date-time">,
      organization: {
        id: p.organization.id as string & tags.Format<"uuid">,
        name: p.organization.name,
        description: p.organization.description ?? undefined,
        logoUri: p.organization.logo_uri ?? undefined,
        currency: p.organization.currency,
        timezone: p.organization.timezone,
        fiscalStartMonth: p.organization.fiscal_start_month,
        createdAt: p.organization.created_at.toISOString() as string &
          tags.Format<"date-time">,
        owner: {
          id: p.organization.owner.id as string & tags.Format<"uuid">,
          email: p.organization.owner.email as string & tags.Format<"email">,
          displayName: p.organization.owner.display_name,
          avatarUri: p.organization.owner.avatar_uri ?? undefined,
          phone: p.organization.owner.phone ?? undefined,
          createdAt: p.organization.owner.created_at.toISOString() as string &
            tags.Format<"date-time">,
        } satisfies IErpHrmMember.ISummary,
      } satisfies IErpHrmOrganization.ISummary,
    }),
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
