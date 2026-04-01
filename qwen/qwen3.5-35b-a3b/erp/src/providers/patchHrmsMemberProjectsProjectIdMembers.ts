import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmsProjectMember.IRequest;
}): Promise<IPageIHrmsProjectMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const project = await MyGlobal.prisma.hrms_projects.findUniqueOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    select: {
      hrms_organization_id: true,
    },
  });
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        id: props.member.id,
        organization: {
          id: project.hrms_organization_id,
        },
        deleted_at: null,
      },
    });
  if (organizationMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  const metric = props.body.metric ?? "total";
  const includeInactive = props.body.includeInactive ?? false;
  const topN = props.body.topN ?? 10;
  const whereBase = {
    project_id: props.projectId,
    status: "active" as const,
    deleted_at: null,
  };
  const employeeStatusFilter = includeInactive
    ? {}
    : { status: "active" as const };
  const projectMembers = await MyGlobal.prisma.hrms_project_members.findMany({
    where: whereBase,
    include: {
      employee: {
        include: {
          department: {
            select: { name: true },
          },
          role: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });
  const total = projectMembers.length;
  const limitedMembers = projectMembers.slice(skip, skip + limit);
  const employeeIds = limitedMembers.map((pm) => pm.employee_id);
  const timelogAggregations = await MyGlobal.prisma.hrms_timelogs.groupBy({
    by: ["employee_id"],
    where: {
      employee_id: { in: employeeIds },
      ...(props.body.startDate && {
        date: { gte: props.body.startDate as any },
      }),
      ...(props.body.endDate && { date: { lte: props.body.endDate as any } }),
      ...(props.body.projectIds && {
        project_id: { in: props.body.projectIds },
      }),
    },
    _sum: {
      duration_minutes: true,
    },
    _count: {
      duration_minutes: true,
    },
  });
  const timelogMap = new Map(
    timelogAggregations.map((agg) => [
      agg.employee_id,
      {
        totalMinutes: agg._sum?.duration_minutes ?? 0,
        billableMinutes: 0,
        count: agg._count?.duration_minutes ?? 0,
      },
    ]),
  );
  const data = limitedMembers.map((pm) => {
    const timelogData = timelogMap.get(pm.employee_id) ?? {
      totalMinutes: 0,
      billableMinutes: 0,
      count: 0,
    };
    const totalHours = timelogData.totalMinutes / 60;
    const billableHours = timelogData.billableMinutes / 60;
    const billableRate = totalHours > 0 ? billableHours / totalHours : 0;
    let rankValue: number;
    switch (metric) {
      case "billable":
        rankValue = billableHours;
        break;
      case "total":
        rankValue = totalHours;
        break;
      case "billable_rate":
        rankValue = billableRate;
        break;
      default:
        rankValue = totalHours;
    }
    return {
      id: pm.employee_id as string & tags.Format<"uuid">,
      displayName: pm.employee.display_name,
      departmentName: pm.employee.department?.name ?? "",
      totalHours,
      billableHours,
      billableRate,
      _rank: rankValue,
    } satisfies IHrmsProjectMember.ISummary & {
      _rank: number;
    };
  });
  data.sort((a, b) => {
    if (metric === "billable_rate") {
      return b.billableRate - a.billableRate;
    }
    if (metric === "billable") {
      return b.billableHours - a.billableHours;
    }
    return b.totalHours - a.totalHours;
  });
  const rankedData = data.slice(0, topN).map((item) => {
    const { _rank, ...rest } = item;
    return rest;
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: rankedData,
  } satisfies IPageIHrmsProjectMember.ISummary;
}
