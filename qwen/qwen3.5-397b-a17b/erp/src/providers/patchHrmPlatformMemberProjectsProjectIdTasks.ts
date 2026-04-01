import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTaskAtSummaryTransformer } from "../transformers/HrmPlatformTaskAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformTask.IRequest;
}): Promise<IPageIHrmPlatformTask.ISummary> {
  await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
  });
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_tasksWhereInput = {
    hrm_platform_project_id: props.projectId,
    deleted_at: null,
    ...(props.body.search &&
      props.body.search.trim() && {
        OR: [
          { title: { contains: props.body.search, mode: "insensitive" } },
          { description: { contains: props.body.search, mode: "insensitive" } },
        ],
      }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.priority && { priority: props.body.priority }),
    ...(props.body.hrm_platform_employee_id !== undefined && {
      hrm_platform_employee_id: props.body.hrm_platform_employee_id,
    }),
  } satisfies Prisma.hrm_platform_tasksWhereInput;
  const orderByInput: Prisma.hrm_platform_tasksOrderByWithRelationInput =
    props.body.sort === "due_date"
      ? { due_date: props.body.direction === "asc" ? "asc" : "desc" }
      : props.body.sort === "priority"
        ? { priority: props.body.direction === "asc" ? "asc" : "desc" }
        : props.body.sort === "title"
          ? { title: props.body.direction === "asc" ? "asc" : "desc" }
          : { created_at: props.body.direction === "asc" ? "asc" : "desc" };
  const data = await MyGlobal.prisma.hrm_platform_tasks.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformTaskAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_tasks.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformTaskAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
