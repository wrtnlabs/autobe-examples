import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmContract";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmContractAtSummaryTransformer } from "../transformers/ErpHrmContractAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberEmployeesEmployeeIdContracts(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IErpHrmContract.IRequest;
}): Promise<IPageIErpHrmContract.ISummary> {
  // Get member's session to find organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: {
        erp_hrm_organization_id: true,
      },
    });
  // Get member's employee record in the organization
  const memberEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: session.erp_hrm_organization_id ?? undefined,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
    },
  });
  if (memberEmployee === null) {
    throw new HttpException("Employee record not found", 403);
  }
  // Check authorization: own contracts or employee:view permission
  const isOwnContracts = memberEmployee.id === props.employeeId;
  if (!isOwnContracts) {
    // Check for employee:view permission
    const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst(
      {
        where: {
          erp_hrm_role_id: memberEmployee.erp_hrm_role_id,
          permission: "employee:view",
        },
      },
    );
    if (permission === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Verify target employee exists in the same organization
  const targetEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      id: props.employeeId,
      erp_hrm_organization_id: session.erp_hrm_organization_id ?? undefined,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (targetEmployee === null) {
    throw new HttpException("Employee not found", 404);
  }
  // Build date conditions
  const now = new Date();
  // Build start_date range condition
  const startDateConditions: Prisma.DateTimeFilter = {};
  if (
    props.body.startDateFrom !== null &&
    props.body.startDateFrom !== undefined
  ) {
    startDateConditions.gte = new Date(props.body.startDateFrom);
  }
  if (props.body.startDateTo !== null && props.body.startDateTo !== undefined) {
    startDateConditions.lte = new Date(props.body.startDateTo);
  }
  // Build end_date range condition
  const endDateConditions: Prisma.DateTimeNullableFilter = {};
  if (props.body.endDateFrom !== null && props.body.endDateFrom !== undefined) {
    endDateConditions.gte = new Date(props.body.endDateFrom);
  }
  if (props.body.endDateTo !== null && props.body.endDateTo !== undefined) {
    endDateConditions.lte = new Date(props.body.endDateTo);
  }
  // Build where clause
  const whereInput = {
    erp_hrm_employee_id: props.employeeId,
    deleted_at: null,
    // Status filter
    ...(props.body.status === "active"
      ? {
          start_date: { lte: now },
          OR: [{ end_date: null }, { end_date: { gt: now } }],
        }
      : props.body.status === "past"
        ? { end_date: { not: null, lte: now } }
        : props.body.status === "upcoming"
          ? { start_date: { gt: now } }
          : {}),
    // Pay period filter
    ...(props.body.payPeriod !== undefined && props.body.payPeriod !== null
      ? { pay_period: props.body.payPeriod }
      : {}),
    // Start date range filters
    ...(Object.keys(startDateConditions).length > 0
      ? { start_date: startDateConditions }
      : {}),
    // End date range filters
    ...(Object.keys(endDateConditions).length > 0
      ? { end_date: endDateConditions }
      : {}),
  } satisfies Prisma.erp_hrm_contractsWhereInput;
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query contracts
  const contracts = await MyGlobal.prisma.erp_hrm_contracts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: [{ start_date: "desc" }, { created_at: "desc" }],
    ...ErpHrmContractAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.erp_hrm_contracts.count({
    where: whereInput,
  });
  // Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      contracts,
      ErpHrmContractAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
