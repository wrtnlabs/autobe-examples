import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContractDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContractDateRange";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployeeContract";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmEmployeeContract";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmEmployeeContractAtSummaryTransformer } from "../transformers/ErpHrmEmployeeContractAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberOrganizationMembersOrganizationMemberIdContracts(props: {
  member: MemberPayload;
  organizationMemberId: string & tags.Format<"uuid">;
  body: IErpHrmEmployeeContract.IRequest;
}): Promise<IPageIErpHrmEmployeeContract.ISummary> {
  // Step 1: Verify the target organization member exists and is not deleted
  const targetOrgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        id: props.organizationMemberId,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
      },
    });
  // Step 2: Find the requesting member's own organization member record in the same organization
  const requestingOrgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        organization_id: targetOrgMember.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
      },
    });
  // Step 3: Authorization — self-access is always allowed; otherwise require employee:view or employee:manage
  const isSelf = requestingOrgMember.id === props.organizationMemberId;
  if (!isSelf) {
    const hasPermission =
      await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
        where: {
          role_id: requestingOrgMember.role_id,
          permission_code: { in: ["employee:view", "employee:manage"] },
        },
        select: { id: true },
      });
    if (hasPermission === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Step 4: Build pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Step 5: Build end_date filter with optional open-ended inclusion
  const endDateOrConditions: Prisma.erp_hrm_employee_contractsWhereInput[] = [];
  if (props.body.endDate != null) {
    const endDateRange: Prisma.DateTimeNullableFilter<"erp_hrm_employee_contracts"> =
      {};
    if (props.body.endDate.gte != null) {
      endDateRange.gte = props.body.endDate.gte;
    }
    if (props.body.endDate.lte != null) {
      endDateRange.lte = props.body.endDate.lte;
    }
    endDateOrConditions.push({ end_date: endDateRange });
    if (props.body.includeOpenEnded === true) {
      endDateOrConditions.push({ end_date: null });
    }
  }
  // Step 6: Build start_date filter
  const startDateFilter: Prisma.DateTimeFilter<"erp_hrm_employee_contracts"> =
    {};
  if (props.body.startDate != null) {
    if (props.body.startDate.gte != null) {
      startDateFilter.gte = props.body.startDate.gte;
    }
    if (props.body.startDate.lte != null) {
      startDateFilter.lte = props.body.startDate.lte;
    }
  }
  const hasStartDateFilter =
    props.body.startDate != null &&
    (props.body.startDate.gte != null || props.body.startDate.lte != null);
  // Step 7: Compose full where clause
  const whereInput = {
    organization_member_id: props.organizationMemberId,
    ...(props.body.isActive != null && { is_active: props.body.isActive }),
    ...(props.body.payPeriod != null && { pay_period: props.body.payPeriod }),
    ...(hasStartDateFilter && { start_date: startDateFilter }),
    ...(endDateOrConditions.length > 0 && { OR: endDateOrConditions }),
  } satisfies Prisma.erp_hrm_employee_contractsWhereInput;
  const orderByInput = {
    start_date:
      props.body.sort === "desc" ? ("desc" as const) : ("asc" as const),
  } satisfies Prisma.erp_hrm_employee_contractsOrderByWithRelationInput;
  // Step 8: Execute queries sequentially
  const records = await MyGlobal.prisma.erp_hrm_employee_contracts.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...ErpHrmEmployeeContractAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_employee_contracts.count({
    where: whereInput,
  });
  // Step 9: Transform and return paginated response
  return {
    data: await ArrayUtil.asyncMap(
      records,
      ErpHrmEmployeeContractAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
