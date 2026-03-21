import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmProjectAtSummaryTransformer } from "../transformers/ErpHrmProjectAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberProjectsAssigned(props: {
  member: MemberPayload;
  body: IErpHrmProject.IRequest;
}): Promise<IPageIErpHrmProject.ISummary> {
  // Get session to find organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("No organization context selected", 400);
  }
  // Find employee record for this member in the current organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: {
      erp_hrm_member_id_erp_hrm_organization_id: {
        erp_hrm_member_id: props.member.id,
        erp_hrm_organization_id: session.erp_hrm_organization_id,
      },
    },
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause for filters
  const whereInput = {
    erp_hrm_employee_id: employee.id,
    deleted_at: null,
    project: {
      deleted_at: null,
      ...(props.body.status && { status: props.body.status }),
      ...(props.body.search && {
        name: { contains: props.body.search, mode: "insensitive" as const },
      }),
    },
  } satisfies Prisma.erp_hrm_project_membersWhereInput;
  // Query project memberships with pagination
  const memberships = await MyGlobal.prisma.erp_hrm_project_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      project: ErpHrmProjectAtSummaryTransformer.select(),
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.erp_hrm_project_members.count({
    where: whereInput,
  });
  // Transform results using the transformer
  const data = await ArrayUtil.asyncMap(memberships, (membership) =>
    ErpHrmProjectAtSummaryTransformer.transform(membership.project),
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
