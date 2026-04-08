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
  const sortBy = props.body.sortBy ?? "start_date";
  const sortOrder = props.body.sortOrder ?? "desc";
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        hrm_platform_organization_id: true,
      },
    },
  );
  if (memberEmployee === null) {
    throw new HttpException("Member has no employee record", 404);
  }
  const whereInput: Prisma.hrm_platform_contractsWhereInput = {
    deleted_at: null,
    hrm_platform_organization_id: memberEmployee.hrm_platform_organization_id,
  };
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  if (props.body.employeeId !== undefined) {
    whereInput.hrm_platform_employee_id = props.body.employeeId;
  }
  if (props.body.startDate !== undefined) {
    whereInput.start_date = { gte: props.body.startDate };
  }
  if (props.body.endDate !== undefined) {
    whereInput.end_date = { lte: props.body.endDate };
  }
  if (props.body.compensationMin !== undefined) {
    whereInput.compensation_amount = { gte: props.body.compensationMin };
  }
  if (props.body.compensationMax !== undefined) {
    whereInput.compensation_amount = { lte: props.body.compensationMax };
  }
  const orderByInput: Prisma.hrm_platform_contractsOrderByWithRelationInput =
    sortBy === "start_date"
      ? { start_date: sortOrder }
      : sortBy === "end_date"
        ? { end_date: sortOrder }
        : sortBy === "created_at"
          ? { created_at: sortOrder }
          : sortBy === "updated_at"
            ? { updated_at: sortOrder }
            : sortBy === "status"
              ? { status: sortOrder }
              : sortBy === "title"
                ? { title: sortOrder }
                : { start_date: "desc" };
  const data = await MyGlobal.prisma.hrm_platform_contracts.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...HrmPlatformContractAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_contracts.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    HrmPlatformContractAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIHrmPlatformContract.ISummary;
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