import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackProjectAtSummaryTransformer } from "../transformers/HrmTimeTrackProjectAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackMemberProjects(props: {
  member: MemberPayload;
  body: IHrmTimeTrackProject.IRequest;
}): Promise<IPageIHrmTimeTrackProject.ISummary> {
  // Get member's organization_id through employees relation
  const memberRecord =
    await MyGlobal.prisma.hrm_time_track_members.findUniqueOrThrow({
      where: {
        id: props.member.id,
        deleted_at: null,
      },
      select: {
        employees: {
          select: {
            hrm_time_track_organization_id: true,
          },
        },
      },
    });
  const organizationId =
    memberRecord.employees[0]?.hrm_time_track_organization_id;
  if (!organizationId) {
    throw new HttpException("Member not associated with any organization", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.hrm_time_track_projectsWhereInput = {
    hrm_time_track_organization_id: organizationId,
    deleted_at: null,
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.search && {
      name: {
        contains: props.body.search,
      },
    }),
  };
  // Fetch projects with pagination
  const records = await MyGlobal.prisma.hrm_time_track_projects.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
      id: "asc",
    },
    ...HrmTimeTrackProjectAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.hrm_time_track_projects.count({
    where: whereInput,
  });
  // Transform records
  const data = await ArrayUtil.asyncMap(
    records,
    HrmTimeTrackProjectAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
