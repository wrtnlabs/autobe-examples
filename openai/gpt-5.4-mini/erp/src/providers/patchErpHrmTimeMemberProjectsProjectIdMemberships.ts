import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProjectMembership";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeProjectMembership";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeProjectMembershipAtSummaryTransformer } from "../transformers/ErpHrmTimeProjectMembershipAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberProjectsProjectIdMemberships(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTimeProjectMembership.IRequest;
}): Promise<IPageIErpHrmTimeProjectMembership.ISummary> {
  const project = await MyGlobal.prisma.erp_hrm_time_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
      },
    },
  );
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    erp_hrm_time_project_id: project.id,
    deleted_at: null,
    ...(props.body.search === undefined
      ? {}
      : {
          project_role: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        }),
  } satisfies Prisma.erp_hrm_time_project_membershipsWhereInput;
  const orderBy = (
    props.body.sort === "project_role"
      ? ([{ project_role: "asc" }, { id: "asc" }] as const)
      : props.body.sort === "created_at"
        ? ([{ created_at: "desc" }, { id: "asc" }] as const)
        : ([{ created_at: "desc" }, { id: "asc" }] as const)
  ) satisfies Prisma.erp_hrm_time_project_membershipsOrderByWithRelationInput[];
  const data = await MyGlobal.prisma.erp_hrm_time_project_memberships.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...ErpHrmTimeProjectMembershipAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.erp_hrm_time_project_memberships.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimeProjectMembershipAtSummaryTransformer.transform,
    ),
  };
}
