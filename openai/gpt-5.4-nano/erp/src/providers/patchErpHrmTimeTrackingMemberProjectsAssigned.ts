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
import { ErpHrmTimeTrackingProjectAtSummaryTransformer } from "../transformers/ErpHrmTimeTrackingProjectAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeTrackingMemberProjectsAssigned(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingProjectMembership.IRequest;
}): Promise<IPageIErpHrmTimeTrackingProject.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const organizationId = (
    props.member as unknown as {
      erp_hrm_time_tracking_organization_id: string & tags.Format<"uuid">;
    }
  ).erp_hrm_time_tracking_organization_id;
  const memberships =
    await MyGlobal.prisma.erp_hrm_time_tracking_project_memberships.findMany({
      where: {
        employee_id: props.member.id,
        deleted_at: null,
        project: {
          deleted_at: null,
          erp_hrm_time_tracking_organization_id: organizationId,
        },
      },
      skip,
      take: limit,
      orderBy: [{ project: { id: "desc" } }, { id: "desc" }],
      select: {
        id: true,
        project: ErpHrmTimeTrackingProjectAtSummaryTransformer.select(),
      },
    });
  const total =
    await MyGlobal.prisma.erp_hrm_time_tracking_project_memberships.count({
      where: {
        employee_id: props.member.id,
        deleted_at: null,
        project: {
          deleted_at: null,
          erp_hrm_time_tracking_organization_id: organizationId,
        },
      },
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      memberships,
      async (m) =>
        await ErpHrmTimeTrackingProjectAtSummaryTransformer.transform(
          m.project,
        ),
    ),
  };
}
