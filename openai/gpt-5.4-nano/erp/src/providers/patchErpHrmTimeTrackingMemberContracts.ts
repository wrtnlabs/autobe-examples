import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingContract";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTrackingContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingContract";
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

export async function patchErpHrmTimeTrackingMemberContracts(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingContract.IRequest;
}): Promise<IPageIErpHrmTimeTrackingContract.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  if (page < 1) {
    throw new HttpException("Invalid page", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Invalid limit", 400);
  }
  const selectedOrganizationId = (props.member as any).organization_id as
    | string
    | undefined;
  if (!selectedOrganizationId) {
    throw new HttpException("Organization context missing", 403);
  }
  const where = {
    erp_hrm_time_tracking_organization_id: selectedOrganizationId,
    ...(props.body.includeDeleted ? {} : { deleted_at: null }),
    ...(props.body.contractNumber
      ? { contract_number: { contains: props.body.contractNumber } }
      : {}),
    ...(props.body.contractTitle
      ? { contract_title: { contains: props.body.contractTitle } }
      : {}),
    ...(props.body.status ? { status: props.body.status } : {}),
    ...(props.body.workTermStartDateFrom || props.body.workTermStartDateTo
      ? {
          work_term_start_date: {
            ...(props.body.workTermStartDateFrom
              ? { gte: new Date(props.body.workTermStartDateFrom) }
              : {}),
            ...(props.body.workTermStartDateTo
              ? { lte: new Date(props.body.workTermStartDateTo) }
              : {}),
          },
        }
      : {}),
    ...(props.body.workTermEndDateFrom || props.body.workTermEndDateTo
      ? {
          work_term_end_date: {
            ...(props.body.workTermEndDateFrom
              ? { gte: new Date(props.body.workTermEndDateFrom as any) }
              : {}),
            ...(props.body.workTermEndDateTo
              ? { lte: new Date(props.body.workTermEndDateTo as any) }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.erp_hrm_time_tracking_contractsWhereInput;
  const orderBy = (() => {
    const dir = props.body.sortDirection ?? "desc";
    const sortBy = props.body.sortBy;
    switch (sortBy) {
      case "created_at":
      case "work_term_start_date":
      case "work_term_end_date":
      case "status":
      case "contract_number":
      case "contract_title":
        return { [sortBy]: dir as Prisma.SortOrder };
      default:
        return { created_at: "desc" as const };
    }
  })() as Prisma.erp_hrm_time_tracking_contractsOrderByWithRelationInput;
  const skip = (page - 1) * limit;
  const [rows, total] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.erp_hrm_time_tracking_contracts.findMany({
      where,
      skip,
      take: limit,
      orderBy: [orderBy, { id: "asc" }],
      select: {
        id: true,
        contract_number: true,
        contract_title: true,
        pay_amount: true,
        pay_currency: true,
        pay_frequency: true,
        work_term_start_date: true,
        work_term_end_date: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: {
          select: {
            id: true,
            email: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.erp_hrm_time_tracking_contracts.count({ where }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((r) => ({
      id: r.id as any,
      contract_number: r.contract_number,
      contract_title: r.contract_title,
      pay_amount: r.pay_amount,
      pay_currency: r.pay_currency,
      pay_frequency: r.pay_frequency,
      work_term_start_date: toISOStringSafe(r.work_term_start_date) as any,
      work_term_end_date: r.work_term_end_date
        ? (toISOStringSafe(r.work_term_end_date) as any)
        : null,
      status: r.status,
      employee: {
        id: r.employee.id as any,
        email: r.employee.email,
        created_at: toISOStringSafe(r.employee.created_at) as any,
        updated_at: toISOStringSafe(r.employee.updated_at) as any,
        deleted_at: r.employee.deleted_at
          ? (toISOStringSafe(r.employee.deleted_at) as any)
          : null,
      },
      created_at: toISOStringSafe(r.created_at) as any,
      updated_at: toISOStringSafe(r.updated_at) as any,
      deleted_at: r.deleted_at ? (toISOStringSafe(r.deleted_at) as any) : null,
    })),
  } satisfies IPageIErpHrmTimeTrackingContract.ISummary;
}
