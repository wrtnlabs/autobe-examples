import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployeeContract";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeContractAtSummaryTransformer } from "../transformers/HrmPlatformEmployeeContractAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberEmployeesEmployeeIdContracts(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmPlatformEmployeeContract.IRequest;
}): Promise<IPageIHrmPlatformEmployeeContract.ISummary> {
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: {
        id: props.employeeId,
        deleted_at: null,
      },
      select: {
        id: true,
        user_id: true,
        organization_id: true,
      },
    });
  const isOwner = employee.user_id === props.member.id;
  if (!isOwner) {
    const memberEmployee =
      await MyGlobal.prisma.hrm_platform_employees.findFirst({
        where: {
          organization_id: employee.organization_id,
          user_id: props.member.id,
          deleted_at: null,
        },
        select: {
          role_id: true,
        },
      });
    if (!memberEmployee) {
      throw new HttpException("Forbidden", 403);
    }
    const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
      where: { id: memberEmployee.role_id },
      select: {
        rolePermissions: {
          select: {
            permission: true,
          },
        },
      },
    });
    const hasViewPermission = role?.rolePermissions.some(
      (p) => p.permission === "employee:view",
    );
    if (!hasViewPermission) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const now = new Date();
  const whereInput = {
    hrm_platform_employee_id: props.employeeId,
    deleted_at: null,
    ...(props.body.pay_period && { pay_period: props.body.pay_period }),
    ...(props.body.start_date_gte && {
      start_date: {
        gte: new Date(props.body.start_date_gte),
      },
    }),
    ...(props.body.start_date_lte && {
      start_date: {
        lte: new Date(props.body.start_date_lte),
      },
    }),
    ...(props.body.status && {
      ...(props.body.status === "active" && {
        OR: [{ end_date: null }, { end_date: { gt: now } }],
      }),
      ...(props.body.status === "ended" && {
        end_date: {
          lt: now,
        },
      }),
    }),
  } satisfies Prisma.hrm_platform_employee_contractsWhereInput;
  const data = await MyGlobal.prisma.hrm_platform_employee_contracts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { start_date: "desc" },
    ...HrmPlatformEmployeeContractAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_employee_contracts.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformEmployeeContractAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
