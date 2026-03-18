import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectAtSummaryTransformer } from "../transformers/HrmPlatformProjectAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberProjects(props: {
  member: MemberPayload;
  body: IHrmPlatformProject.IRequest;
}): Promise<IPageIHrmPlatformProject.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const projectMemberships =
    await MyGlobal.prisma.hrm_platform_project_members.findMany({
      where: {
        hrm_platform_employee_id: props.member.id,
        deleted_at: null,
      },
      select: {
        hrm_platform_project_id: true,
      },
    });
  const projectIds = projectMemberships.map((pm) => pm.hrm_platform_project_id);
  const whereInput: Prisma.hrm_platform_projectsWhereInput = {
    deleted_at: null,
    ...(projectIds.length > 0 && { id: { in: projectIds } }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.search && {
      name: { contains: props.body.search, mode: "insensitive" },
    }),
  } satisfies Prisma.hrm_platform_projectsWhereInput;
  const orderByInput: Prisma.hrm_platform_projectsOrderByWithRelationInput =
    props.body.sort === "name"
      ? { name: props.body.order === "asc" ? "asc" : "desc" }
      : props.body.sort === "status"
        ? { status: props.body.order === "asc" ? "asc" : "desc" }
        : { created_at: props.body.order === "asc" ? "asc" : "desc" };
  const data = await MyGlobal.prisma.hrm_platform_projects.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformProjectAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_projects.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformProjectAtSummaryTransformer.transform,
    ),
  };
}
