import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimelogAtSummaryTransformer } from "../transformers/HrmPlatformTimelogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberTimelogs(props: {
  member: MemberPayload;
  body: IHrmPlatformTimelog.IRequest;
}): Promise<IPageIHrmPlatformTimelog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const member = await MyGlobal.prisma.hrm_platform_members.findUnique({
    where: { id: props.member.id, deleted_at: null },
    include: {
      employees: {
        where: { deleted_at: null },
        include: {
          role: {
            include: {
              permissions: {
                where: { deleted_at: null },
                include: {
                  permission: {
                    select: { code: true, deleted_at: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (member === null) {
    throw new HttpException("Member not found", 404);
  }
  const employee = member.employees[0];
  if (employee === undefined) {
    throw new HttpException("Employee not found", 404);
  }
  const hasTimeViewAll = employee.role.permissions.some(
    (rp) =>
      rp.permission.code === "time:view_all" &&
      rp.permission.deleted_at === null,
  );
  const whereInput: Prisma.hrm_platform_timelogsWhereInput = {
    deleted_at: null,
    employee: {
      deleted_at: null,
      hrm_platform_organization_id: employee.hrm_platform_organization_id,
    },
    project: {
      deleted_at: null,
      hrm_platform_organization_id: employee.hrm_platform_organization_id,
    },
    ...(hasTimeViewAll === false && {
      hrm_platform_employee_id: employee.id,
    }),
    ...(props.body.startDate !== undefined && {
      date: {
        gte: new Date(props.body.startDate),
      },
    }),
    ...(props.body.endDate !== undefined && {
      date: {
        lte: new Date(props.body.endDate),
      },
    }),
    ...(props.body.projectId !== undefined && {
      hrm_platform_project_id: props.body.projectId,
    }),
    ...(props.body.taskId !== undefined && {
      hrm_platform_task_id: props.body.taskId,
    }),
    ...(props.body.billable !== undefined && {
      billable: props.body.billable,
    }),
    ...(props.body.employeeId !== undefined &&
      hasTimeViewAll === true && {
        hrm_platform_employee_id: props.body.employeeId,
      }),
    ...(props.body.search !== undefined && {
      description: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
  } satisfies Prisma.hrm_platform_timelogsWhereInput;
  const data = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { date: "desc" },
    ...HrmPlatformTimelogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_timelogs.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformTimelogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmPlatformTimelog.ISummary;
}
