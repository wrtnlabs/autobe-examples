import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
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
import { ErpHrmProjectMemberAtSummaryTransformer } from "../transformers/ErpHrmProjectMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmProjectMember.IRequest;
}): Promise<IPageIErpHrmProjectMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Verify project exists and user has access
  const project = await MyGlobal.prisma.erp_hrm_projects.findUnique({
    where: { id: props.projectId },
    select: { id: true, organization_id: true },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  // Verify user is a member of the organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: project.organization_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause
  const whereInput = {
    erp_hrm_project_id: props.projectId,
    deleted_at: null,
    ...(props.body.role !== undefined && { role: props.body.role }),
    ...(props.body.search !== undefined && {
      employee: {
        member: {
          display_name: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      },
    }),
  } satisfies Prisma.erp_hrm_project_membersWhereInput;
  // Query with pagination
  const data = await MyGlobal.prisma.erp_hrm_project_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ErpHrmProjectMemberAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.erp_hrm_project_members.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmProjectMemberAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
