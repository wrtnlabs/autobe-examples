import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
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

export async function patchHrmPlatformMemberTasks(props: {
  member: MemberPayload;
  body: IHrmPlatformTask.IRequest;
}): Promise<IPageIHrmPlatformTask.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.page_size ?? 20;
  const skip = (page - 1) * limit;
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findUnique(
    {
      where: { id: props.member.session_id },
      select: { hrm_platform_organization_id: true },
    },
  );
  if (session === null) {
    throw new HttpException("Session not found", 401);
  }
  if (session.hrm_platform_organization_id === null) {
    throw new HttpException("Organization not found", 403);
  }
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      organization_id: session.hrm_platform_organization_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 403);
  }
  const whereInput: Prisma.hrm_platform_tasksWhereInput = {
    deleted_at: null,
    project: {
      memberships: {
        some: {
          hrm_platform_employee_id: employee.id,
          deleted_at: null,
        },
      },
    },
  };
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  if (props.body.priority !== undefined) {
    whereInput.priority = props.body.priority;
  }
  if (props.body.assigned_employee_id !== undefined) {
    whereInput.assigned_employee_id = props.body.assigned_employee_id;
  }
  if (props.body.search !== undefined) {
    whereInput.title = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  const sort_by = props.body.sort_by ?? "created_at";
  const sort_order = props.body.sort_order ?? "desc";
  const orderByInput: Prisma.hrm_platform_tasksOrderByWithRelationInput = (
    sort_by === "due_date"
      ? { due_date: sort_order }
      : sort_by === "priority"
        ? { priority: sort_order }
        : { created_at: sort_order }
  ) satisfies Prisma.hrm_platform_tasksOrderByWithRelationInput;
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
