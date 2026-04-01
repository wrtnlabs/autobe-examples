import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformContract";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformContractAtSummaryTransformer } from "../transformers/HrmPlatformContractAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberEmployeesEmployeeIdContracts(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmPlatformContract.IRequest;
}): Promise<IPageIHrmPlatformContract.ISummary> {
  const employee = await MyGlobal.prisma.hrm_platform_employees.findUnique({
    where: { id: props.employeeId },
    select: {
      id: true,
      hrm_platform_user_id: true,
      hrm_platform_organization_id: true,
      hrm_platform_role_id: true,
      deleted_at: true,
    },
  });
  if (employee === null || employee.deleted_at !== null) {
    throw new HttpException("Employee not found", 404);
  }
  if (employee.hrm_platform_user_id !== props.member.id) {
    const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
      where: {
        id: employee.hrm_platform_role_id,
        deleted_at: null,
      },
      select: {
        hrm_platform_organization_id: true,
        permissions: {
          select: {
            permission: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });
    if (
      role === null ||
      role.hrm_platform_organization_id !==
        employee.hrm_platform_organization_id
    ) {
      throw new HttpException("Forbidden", 403);
    }
    const hasPermission = role.permissions.some(
      (rp) => rp.permission.code === "employee:view",
    );
    if (!hasPermission) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_contractsWhereInput = {
    hrm_platform_employee_id: props.employeeId,
    deleted_at: null,
    ...(props.body.start_date_from !== undefined && {
      start_date: {
        gte: new Date(props.body.start_date_from),
      },
    }),
    ...(props.body.start_date_to !== undefined && {
      start_date: {
        lte: new Date(props.body.start_date_to),
      },
    }),
    ...(props.body.end_date_from !== undefined && {
      end_date: {
        gte: new Date(props.body.end_date_from),
      },
    }),
    ...(props.body.end_date_to !== undefined && {
      end_date: {
        lte: new Date(props.body.end_date_to),
      },
    }),
    ...(props.body.pay_period !== undefined && {
      pay_period: props.body.pay_period,
    }),
  };
  const sortBy = props.body.sortBy ?? "start_date";
  const sortOrder = props.body.sortOrder ?? "desc";
  const validSortFields = [
    "start_date",
    "end_date",
    "pay_rate",
    "pay_period",
    "working_hours_per_week",
    "created_at",
  ];
  if (!validSortFields.includes(sortBy)) {
    throw new HttpException("Invalid sort field", 400);
  }
  const orderByInput: Prisma.hrm_platform_contractsOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };
  const [contracts, total] = await Promise.all([
    MyGlobal.prisma.hrm_platform_contracts.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...HrmPlatformContractAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_platform_contracts.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      contracts,
      HrmPlatformContractAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmPlatformContract.ISummary;
}
