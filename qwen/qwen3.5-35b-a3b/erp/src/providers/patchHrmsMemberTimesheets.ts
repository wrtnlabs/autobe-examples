import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTimesheet";
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

export async function patchHrmsMemberTimesheets(props: {
  member: MemberPayload;
  body: IHrmsTimesheet.IRequest;
}): Promise<IPageIHrmsTimesheet.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Validate member is part of the requested organization
  const memberOrganization =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: props.body.organization_id,
        deleted_at: null,
      },
    });
  if (!memberOrganization) {
    throw new HttpException("Not a member of this organization", 403);
  }
  // Find employee record for this member in this organization
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      organization_member_id: memberOrganization.id,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("No employee record found", 403);
  }
  // Check if user has time:approve permission for access control
  const hasTimeApprovePermission =
    (await MyGlobal.prisma.hrms_organization_role_permissions.count({
      where: {
        hrms_organization_role_id: memberOrganization.hrms_organization_role_id,
        permission: "time:approve",
      },
    })) > 0;
  // Build date range filter
  const startDate = new Date(props.body.start_date);
  const endDate = new Date(props.body.end_date);
  const whereInput: Prisma.hrms_timesheetsWhereInput = {
    deleted_at: null,
    week_start_date: {
      gte: startDate,
      lte: endDate,
    },
  };
  // Restrict to own timesheets if no approve permission
  if (!hasTimeApprovePermission) {
    whereInput.hrms_employee_id = employee.id;
  }
  // Configure sorting (default: week_start_date descending)
  const sortOrder = props.body.sort_order ?? "desc";
  const orderByInput: Prisma.hrms_timesheetsOrderByWithRelationInput = {
    week_start_date: sortOrder,
  };
  // Execute queries in parallel
  const [timesheets, total] = await Promise.all([
    MyGlobal.prisma.hrms_timesheets.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      include: {
        employee: {
          select: {
            id: true,
            display_name: true,
            organizationMember: {
              select: {
                member: {
                  select: { id: true, email: true },
                },
              },
            },
          },
        },
        reviewer: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    }),
    MyGlobal.prisma.hrms_timesheets.count({ where: whereInput }),
  ]);
  return {
    data: timesheets.map((ts) => ({
      project_id: ts.id satisfies string & tags.Format<"uuid">,
      project_name: ts.id,
      budget_hours: 0,
      actual_hours: 0,
      utilization_percentage: 0,
      utilization_flag: false,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
