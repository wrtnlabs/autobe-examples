import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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

export async function patchHrmPlatformMemberContracts(props: {
  member: MemberPayload;
  body: IHrmPlatformContract.IRequest;
}): Promise<IPageIHrmPlatformContract.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
      expired_at: { gt: new Date() },
      hrm_platform_member_id: props.member.id,
    },
    select: { organization_id: true },
  });
  if (session === null || session.organization_id === null) {
    throw new HttpException("Session not found or expired", 401);
  }
  const organizationId = session.organization_id;
  const filterCondition: Prisma.hrm_platform_contractsWhereInput = {
    deleted_at: null,
    hrm_platform_organization_id: organizationId,
  };
  if (props.body.status !== undefined) {
    filterCondition.status = props.body.status;
  }
  if (props.body.employeeId !== undefined) {
    filterCondition.hrm_platform_employee_id = props.body.employeeId;
  }
  if (props.body.startDate !== undefined) {
    filterCondition.start_date = { gte: props.body.startDate };
  }
  if (props.body.endDate !== undefined) {
    filterCondition.end_date = { lte: props.body.endDate };
  }
  if (
    props.body.compensationMin !== undefined ||
    props.body.compensationMax !== undefined
  ) {
    filterCondition.compensation_amount = {};
    if (props.body.compensationMin !== undefined) {
      filterCondition.compensation_amount.gte = props.body.compensationMin;
    }
    if (props.body.compensationMax !== undefined) {
      filterCondition.compensation_amount.lte = props.body.compensationMax;
    }
  }
  const whereInput =
    filterCondition satisfies Prisma.hrm_platform_contractsWhereInput;
  const orderByInput: Prisma.hrm_platform_contractsOrderByWithRelationInput =
    {};
  switch (props.body.sortBy) {
    case "start_date":
      orderByInput.start_date = props.body.sortOrder ?? "desc";
      break;
    case "end_date":
      orderByInput.end_date = props.body.sortOrder ?? "desc";
      break;
    case "created_at":
      orderByInput.created_at = props.body.sortOrder ?? "desc";
      break;
    case "updated_at":
      orderByInput.updated_at = props.body.sortOrder ?? "desc";
      break;
    case "status":
      orderByInput.status = props.body.sortOrder ?? "asc";
      break;
    case "title":
      orderByInput.title = props.body.sortOrder ?? "asc";
      break;
    default:
      orderByInput.start_date = "desc";
  }
  const records = await MyGlobal.prisma.hrm_platform_contracts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformContractAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_contracts.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(
    records,
    HrmPlatformContractAtSummaryTransformer.transform,
  );
  const pages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
    data,
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
// import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
// import { IPageIHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformContract";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberContracts(props: {
//   member: MemberPayload;
//   body: IHrmPlatformContract.IRequest;
// }): Promise<IPageIHrmPlatformContract.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_contracts.findMany({
//     ...HrmPlatformContractAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformContractAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------