import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
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
import { HrmPlatformContractAtSummaryTransformer } from "../transformers/HrmPlatformContractAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformContracts(props: {
  body: IHrmPlatformContract.IRequest;
}): Promise<IPageIHrmPlatformContract.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_contractsWhereInput = {
    deleted_at: null,
    ...(props.body.employee_id && {
      hrm_platform_employee_id: props.body.employee_id,
    }),
    ...(props.body.pay_period && { pay_period: props.body.pay_period }),
    ...(props.body.from_date && {
      start_at: { gte: new Date(props.body.from_date) },
    }),
    ...(props.body.to_date && {
      start_at: { lte: new Date(props.body.to_date) },
    }),
    ...(props.body.status === "active" && {
      OR: [{ end_at: null }, { end_at: { gt: new Date() } }],
    }),
    ...(props.body.status === "historical" && {
      end_at: { lt: new Date() },
    }),
  };
  if (props.body.search) {
    whereInput.employee = {
      OR: [
        {
          member: {
            email: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
        },
      ],
    };
  }
  const sortBy = props.body.sortBy ?? "start_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput = {
    [sortBy]: sortOrder,
  } satisfies Prisma.hrm_platform_contractsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.hrm_platform_contracts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformContractAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_contracts.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformContractAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
