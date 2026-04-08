import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
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

export async function patchHrmPlatformMemberEmployeeContracts(props: {
  member: MemberPayload;
  body: IHrmPlatformEmployeeContract.IRequest;
}): Promise<IPageIHrmPlatformEmployeeContract.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const memberships =
    await MyGlobal.prisma.hrm_platform_organization_memberships.findMany({
      where: { hrm_platform_member_id: props.member.id },
      select: { hrm_platform_organization_id: true },
    });
  const organizationIds = memberships.map(
    (m) => m.hrm_platform_organization_id,
  );
  const whereInput: Prisma.hrm_platform_employee_contractsWhereInput = {
    deleted_at: null,
    employee: {
      organization_id: {
        in: organizationIds,
      },
    },
    ...(props.body.employee_id && {
      hrm_platform_employee_id: props.body.employee_id,
    }),
    ...(props.body.start_date_from && {
      start_date: { gte: new Date(props.body.start_date_from) },
    }),
    ...(props.body.start_date_to && {
      start_date: { lte: new Date(props.body.start_date_to) },
    }),
    ...(props.body.end_date_from && {
      end_date: { gte: new Date(props.body.end_date_from) },
    }),
    ...(props.body.end_date_to && {
      end_date: { lte: new Date(props.body.end_date_to) },
    }),
    ...(props.body.pay_period && {
      pay_period: props.body.pay_period,
    }),
    ...(props.body.status === "active" && {
      end_date: null,
    }),
    ...(props.body.status === "historical" && {
      end_date: { not: null },
    }),
  } satisfies Prisma.hrm_platform_employee_contractsWhereInput;
  const records =
    await MyGlobal.prisma.hrm_platform_employee_contracts.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: {
        [props.body.sort ?? "created_at"]: props.body.direction ?? "desc",
      } satisfies Prisma.hrm_platform_employee_contractsOrderByWithRelationInput,
      ...HrmPlatformEmployeeContractAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.hrm_platform_employee_contracts.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmPlatformEmployeeContractAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmPlatformEmployeeContract.ISummary;
}
