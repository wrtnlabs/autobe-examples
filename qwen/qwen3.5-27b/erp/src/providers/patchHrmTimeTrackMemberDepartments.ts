import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackDepartmentAtSummaryTransformer } from "../transformers/HrmTimeTrackDepartmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackMemberDepartments(props: {
  member: MemberPayload;
  body: IHrmTimeTrackDepartment.IRequest;
}): Promise<IPageIHrmTimeTrackDepartment.ISummary> {
  const session =
    await MyGlobal.prisma.hrm_time_track_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { hrm_time_track_organization_id: true },
    });
  const organizationId = session.hrm_time_track_organization_id;
  const whereInput: Prisma.hrm_time_track_departmentsWhereInput = {
    hrm_time_track_organization_id: organizationId,
    deleted_at: null,
    ...(props.body.search && {
      name: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.parent_department_id !== undefined &&
      props.body.parent_department_id !== null && {
        parent_department_id: props.body.parent_department_id,
      }),
    ...(props.body.parent_department_id === null && {
      parent_department_id: null,
    }),
  };
  const sort = props.body.sort || "created_at:desc";
  const [field, direction] = sort.split(":");
  const orderByInput: Prisma.hrm_time_track_departmentsOrderByWithRelationInput =
    {
      created_at: "desc",
    };
  if (field === "name") {
    orderByInput.name = direction === "asc" ? "asc" : "desc";
  } else if (field === "created_at") {
    orderByInput.created_at = direction === "asc" ? "asc" : "desc";
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.hrm_time_track_departments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmTimeTrackDepartmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_time_track_departments.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await HrmTimeTrackDepartmentAtSummaryTransformer.transformAll(data),
  };
}
