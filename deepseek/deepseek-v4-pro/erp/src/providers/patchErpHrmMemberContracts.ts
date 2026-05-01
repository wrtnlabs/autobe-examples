import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
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
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization selected", 400);
  }
  const organizationId = session.erp_hrm_organization_id;
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const now = toISOStringSafe(new Date()) satisfies string as string;
  const andConditions: Prisma.erp_hrm_contractsWhereInput[] = [
    { deleted_at: null },
    {
      employee: {
        erp_hrm_organization_id: organizationId,
        deleted_at: null,
      },
    },
  ];
  if (props.body.employeeId !== undefined) {
    andConditions.push({ erp_hrm_employee_id: props.body.employeeId });
  }
  if (
    props.body.startDateFrom !== undefined ||
    props.body.startDateTo !== undefined
  ) {
    andConditions.push({
      start_date: {
        ...(props.body.startDateFrom !== undefined
          ? { gte: props.body.startDateFrom }
          : {}),
        ...(props.body.startDateTo !== undefined
          ? { lte: props.body.startDateTo }
          : {}),
      },
    });
  }
  if (
    props.body.endDateFrom !== undefined ||
    props.body.endDateTo !== undefined
  ) {
    andConditions.push({
      end_date: {
        ...(props.body.endDateFrom !== undefined
          ? { gte: props.body.endDateFrom }
          : {}),
        ...(props.body.endDateTo !== undefined
          ? { lte: props.body.endDateTo }
          : {}),
      },
    });
  }
  if (props.body.payPeriod !== undefined) {
    andConditions.push({ pay_period: { in: props.body.payPeriod } });
  }
  if (props.body.status === "active") {
    andConditions.push({
      OR: [{ end_date: null }, { end_date: { gte: now } }],
    });
  } else if (props.body.status === "past") {
    andConditions.push({ end_date: { not: null, lt: now } });
  }
  if (props.body.search !== undefined) {
    andConditions.push({
      notes: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    });
  }
  const whereInput: Prisma.erp_hrm_contractsWhereInput = {
    AND: andConditions,
  };
  const sortField = props.body.sort ?? "startDate";
  const orderDir: "asc" | "desc" = props.body.order === "asc" ? "asc" : "desc";
  let orderByInput: Prisma.erp_hrm_contractsOrderByWithRelationInput;
  if (sortField === "startDate") {
    orderByInput = { start_date: orderDir };
  } else if (sortField === "endDate") {
    orderByInput = { end_date: orderDir };
  } else if (sortField === "payRate") {
    orderByInput = { pay_rate: orderDir };
  } else {
    orderByInput = { working_hours_per_week: orderDir };
  }
  const data = await MyGlobal.prisma.erp_hrm_contracts.findMany({
    ...ErpHrmContractAtSummaryTransformer.select(),
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
  });
  const total = await MyGlobal.prisma.erp_hrm_contracts.count({
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
      data,
      ErpHrmContractAtSummaryTransformer.transform,
    ),
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
// import { IPageIErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmContract";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmMemberContracts(props: {
//   member: MemberPayload;
//   body: IErpHrmContract.IRequest;
// }): Promise<IPageIErpHrmContract.ISummary> {
//   const records = await MyGlobal.prisma.erp_hrm_contracts.findMany({
//     ...ErpHrmContractAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ErpHrmContractAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------