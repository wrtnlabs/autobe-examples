import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
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

export async function patchErpHrmMemberContracts(props: {
  member: MemberPayload;
  body: IErpHrmContract.IRequest;
}): Promise<IPageIErpHrmContract.ISummary> {
  const { member, body } = props;
  const limit = Math.min(body.limit ?? 20, 100);
  const sortBy = body.sortBy ?? "created_at";
  const sortOrder = body.sortOrder ?? "desc";
  const memberRecord =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: { user_id: member.id },
      select: { organization_id: true },
    });
  const organizationId = memberRecord.organization_id;
  const where: Prisma.erp_hrm_contractsWhereInput = {
    organization_id: organizationId,
    deleted_at: null,
  };
  if (body.employmentType !== undefined && body.employmentType !== null) {
    where.employment_type = body.employmentType;
  }
  if (body.isActive !== undefined && body.isActive !== null) {
    where.is_active = body.isActive;
  }
  if (body.payPeriod !== undefined && body.payPeriod !== null) {
    where.pay_period = body.payPeriod;
  }
  if (
    body.organizationMemberId !== undefined &&
    body.organizationMemberId !== null
  ) {
    where.organization_member_id = body.organizationMemberId;
  }
  if (body.payRateMin !== undefined && body.payRateMin !== null) {
    where.pay_rate = { gte: body.payRateMin };
  }
  if (body.payRateMax !== undefined && body.payRateMax !== null) {
    where.pay_rate = {
      ...((where.pay_rate as Prisma.FloatFilter<"erp_hrm_contracts">) ?? {}),
      lte: body.payRateMax,
    };
  }
  if (body.workingHoursMin !== undefined && body.workingHoursMin !== null) {
    where.working_hours_per_week = { gte: body.workingHoursMin };
  }
  if (body.workingHoursMax !== undefined && body.workingHoursMax !== null) {
    where.working_hours_per_week = {
      ...((where.working_hours_per_week as Prisma.FloatFilter<"erp_hrm_contracts">) ??
        {}),
      lte: body.workingHoursMax,
    };
  }
  if (
    (body.startDateFrom !== undefined && body.startDateFrom !== null) ||
    (body.startDateTo !== undefined && body.startDateTo !== null)
  ) {
    where.start_date = {};
    if (body.startDateFrom !== undefined && body.startDateFrom !== null) {
      where.start_date.gte = new Date(body.startDateFrom);
    }
    if (body.startDateTo !== undefined && body.startDateTo !== null) {
      where.start_date.lte = new Date(body.startDateTo);
    }
  }
  if (
    (body.endDateFrom !== undefined && body.endDateFrom !== null) ||
    (body.endDateTo !== undefined && body.endDateTo !== null)
  ) {
    where.end_date = {};
    if (body.endDateFrom !== undefined && body.endDateFrom !== null) {
      where.end_date.gte = new Date(body.endDateFrom);
    }
    if (body.endDateTo !== undefined && body.endDateTo !== null) {
      where.end_date.lte = new Date(body.endDateTo);
    }
  }
  if (
    (body.createdAtFrom !== undefined && body.createdAtFrom !== null) ||
    (body.createdAtTo !== undefined && body.createdAtTo !== null)
  ) {
    where.created_at = {};
    if (body.createdAtFrom !== undefined && body.createdAtFrom !== null) {
      where.created_at.gte = new Date(body.createdAtFrom);
    }
    if (body.createdAtTo !== undefined && body.createdAtTo !== null) {
      where.created_at.lte = new Date(body.createdAtTo);
    }
  }
  const orderBy: Prisma.erp_hrm_contractsOrderByWithRelationInput =
    sortBy === "pay_rate"
      ? { pay_rate: sortOrder }
      : sortBy === "start_date"
        ? { start_date: sortOrder }
        : { created_at: sortOrder };
  let skip: number | undefined;
  let cursor: Prisma.erp_hrm_contractsWhereUniqueInput | undefined;
  let pageNumber = body.page ?? 1;
  if (body.cursor) {
    try {
      const decoded = JSON.parse(
        Buffer.from(body.cursor, "base64").toString("utf-8"),
      ) as {
        created_at: string;
        id: string;
      };
      cursor = {
        created_at: new Date(decoded.created_at),
        id: decoded.id,
      };
    } catch {
      cursor = undefined;
    }
  } else if (pageNumber > 1) {
    skip = (pageNumber - 1) * limit;
  }
  const data = await MyGlobal.prisma.erp_hrm_contracts.findMany({
    where,
    take: limit,
    skip,
    cursor,
    orderBy,
    ...ErpHrmContractAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_contracts.count({ where });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ErpHrmContractAtSummaryTransformer.transform,
  );
  const lastItem = data[data.length - 1];
  const nextCursor = lastItem
    ? Buffer.from(
        JSON.stringify({
          created_at: lastItem.created_at.toISOString(),
          id: lastItem.id,
        }),
      ).toString("base64")
    : null;
  const totalPages = Math.ceil(total / limit);
  return {
    data: transformedData,
    pagination: {
      current: pageNumber,
      limit,
      records: total,
      pages: totalPages,
    },
  };
}
