import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import { IHrmPlatformContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContractSnapshot";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformContractSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformContractSnapshotAtSummaryTransformer } from "../transformers/HrmPlatformContractSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberContractSnapshots(props: {
  member: MemberPayload;
  body: IHrmPlatformContractSnapshot.IRequest;
}): Promise<IPageIHrmPlatformContractSnapshot.ISummary> {
  // Verify member exists and is active
  const member = await MyGlobal.prisma.hrm_platform_members.findFirst({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
  });
  if (member === null) {
    throw new HttpException("Member not found", 404);
  }
  // Get member's employee record to determine organization context
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      role: {
        select: {
          id: true,
          code: true,
          permissions: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  } satisfies Prisma.hrm_platform_employeesFindFirstArgs);
  if (employee === null) {
    throw new HttpException("Member is not enrolled in any organization", 403);
  }
  const organizationId = employee.hrm_platform_organization_id;
  const hasOrgManage = employee.role.permissions.some(
    (p) => p.id === "org:manage",
  );
  const hasEmployeeView = employee.role.permissions.some(
    (p) => p.id === "employee:view",
  );
  if (!hasOrgManage && !hasEmployeeView) {
    throw new HttpException("Forbidden: insufficient permissions", 403);
  }
  // Build contract filter conditions separately
  const contractFilters: Prisma.hrm_platform_contract_snapshotsWhereInput["contract"] =
    {};
  // Base organization filter
  contractFilters.employee = {
    hrm_platform_organization_id: organizationId,
    deleted_at: null,
  };
  // Apply filters from body
  if (props.body.contract_id !== undefined) {
    contractFilters.id = props.body.contract_id;
  }
  if (props.body.employee_id !== undefined) {
    if (!hasOrgManage && !hasEmployeeView) {
      throw new HttpException("Forbidden", 403);
    }
    contractFilters.employee = {
      id: props.body.employee_id,
      deleted_at: null,
    };
  }
  // Build start_date filter without spread syntax
  if (
    props.body.start_date_from !== undefined ||
    props.body.start_date_to !== undefined
  ) {
    contractFilters.start_date = {};
    if (props.body.start_date_from !== undefined) {
      contractFilters.start_date.gte = new Date(props.body.start_date_from);
    }
    if (props.body.start_date_to !== undefined) {
      contractFilters.start_date.lte = new Date(props.body.start_date_to);
    }
  }
  if (props.body.end_date_from !== undefined) {
    contractFilters.OR = [
      {
        end_date: {
          gte: new Date(props.body.end_date_from),
        },
      },
      {
        end_date: null,
      },
    ];
  }
  if (props.body.end_date_to !== undefined) {
    contractFilters.end_date = {
      lte: new Date(props.body.end_date_to),
    };
  }
  // Build whereInput with all filters
  const whereInput: Prisma.hrm_platform_contract_snapshotsWhereInput = {
    contract: contractFilters,
  };
  if (props.body.pay_period !== undefined) {
    whereInput.pay_period = props.body.pay_period;
  }
  if (props.body.notes !== undefined && props.body.notes !== null) {
    whereInput.notes = {
      contains: props.body.notes,
    };
  }
  if (props.body.created_at_from !== undefined) {
    whereInput.created_at = {
      gte: new Date(props.body.created_at_from),
    };
  }
  if (props.body.created_at_to !== undefined) {
    whereInput.created_at = {
      lte: new Date(props.body.created_at_to),
    };
  }
  // Pagination
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  // Fetch data
  const snapshots =
    await MyGlobal.prisma.hrm_platform_contract_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...HrmPlatformContractSnapshotAtSummaryTransformer.select(),
    } satisfies Prisma.hrm_platform_contract_snapshotsFindManyArgs);
  // Count total
  const total = await MyGlobal.prisma.hrm_platform_contract_snapshots.count({
    where: whereInput,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    snapshots,
    HrmPlatformContractSnapshotAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmPlatformContractSnapshot.ISummary;
}
