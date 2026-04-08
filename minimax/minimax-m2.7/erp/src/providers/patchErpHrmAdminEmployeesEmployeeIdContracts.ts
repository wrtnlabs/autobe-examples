import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmContractTransformer } from "../transformers/ErpHrmContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdminEmployeesEmployeeIdContracts(props: {
  admin: AdminPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IErpHrmContract.IRequest;
}): Promise<IPageIErpHrmContract> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build start_date range conditions
  const startDateConditions = {
    ...(props.body.startDateFrom && { gte: props.body.startDateFrom }),
    ...(props.body.startDateTo && { lte: props.body.startDateTo }),
  };
  // Build end_date range conditions
  const endDateConditions = {
    ...(props.body.endDateFrom && { gte: props.body.endDateFrom }),
    ...(props.body.endDateTo && { lte: props.body.endDateTo }),
  };
  // Build status filter conditions
  const statusCondition = ((): Record<string, unknown> => {
    if (props.body.status === "active") {
      return { end_date: null };
    }
    if (props.body.status === "ended") {
      return { end_date: { lt: new Date().toISOString() } };
    }
    if (props.body.status === "ongoing") {
      return { end_date: { gt: new Date().toISOString() } };
    }
    return {};
  })();
  // Combine all conditions
  const whereInput = {
    erp_hrm_employee_id: props.employeeId,
    ...(Object.keys(startDateConditions).length > 0 && {
      start_date: startDateConditions,
    }),
    ...(Object.keys(endDateConditions).length > 0 && {
      end_date: endDateConditions,
    }),
    ...(props.body.payPeriod && { pay_period: props.body.payPeriod }),
    ...statusCondition,
  } satisfies Prisma.erp_hrm_contractsWhereInput;
  const records = await MyGlobal.prisma.erp_hrm_contracts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { start_date: "desc" },
    ...ErpHrmContractTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_contracts.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ErpHrmContractTransformer.transform,
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
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmAdminEmployeesEmployeeIdContracts(props: {
//   admin: AdminPayload;
//   employeeId: string & tags.Format<"uuid">;
//   body: IErpHrmContract.IRequest;
// }): Promise<IPageIErpHrmContract> {
//   const records = await MyGlobal.prisma.erp_hrm_contracts.findMany({
//     ...ErpHrmContractTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ErpHrmContractTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------