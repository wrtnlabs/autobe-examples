import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProjectMember";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackProjectMemberAtSummaryTransformer } from "../transformers/HrmTimeTrackProjectMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackProjectMember.IRequest;
}): Promise<IPageIHrmTimeTrackProjectMember.ISummary> {
  // Validate project exists and is not deleted
  const project =
    await MyGlobal.prisma.hrm_time_track_projects.findUniqueOrThrow({
      where: {
        id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_track_organization_id: true,
      },
    });
  // Build WHERE clause
  const whereInput: Prisma.hrm_time_track_project_membersWhereInput = {
    deleted_at: null,
    hrm_time_track_project_id: props.projectId,
    ...(props.body.role !== undefined && { role: props.body.role }),
    ...(props.body.search !== undefined && {
      employee: {
        member: {
          email: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
      },
    }),
    ...(props.body.status !== undefined && {
      employee: {
        status: props.body.status,
      },
    }),
  } satisfies Prisma.hrm_time_track_project_membersWhereInput;
  // Build ORDER BY clause
  const orderByInput: Prisma.hrm_time_track_project_membersOrderByWithRelationInput =
    (() => {
      const sort = props.body.sort ?? "created_at";
      const sortOrder = (props.body.sortOrder ?? "asc") as "asc" | "desc";
      switch (sort) {
        case "role":
          return { role: sortOrder };
        case "employee_name":
          return { employee: { member: { email: sortOrder } } };
        case "created_at":
        default:
          return { created_at: sortOrder };
      }
    })() satisfies Prisma.hrm_time_track_project_membersOrderByWithRelationInput;
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Query records
  const records = await MyGlobal.prisma.hrm_time_track_project_members.findMany(
    {
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...HrmTimeTrackProjectMemberAtSummaryTransformer.select(),
    },
  );
  // Count total
  const total = await MyGlobal.prisma.hrm_time_track_project_members.count({
    where: whereInput,
  });
  // Transform and return
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackProjectMemberAtSummaryTransformer.transform,
    ),
  };
}
